import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockGetUser = vi.fn();
const mockAssignmentUpdateEq = vi.fn();

function makeProfileChain(singleFn: ReturnType<typeof vi.fn>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: singleFn })),
    })),
  };
}

// assignment single-row select: .select(...).eq('id', ...).single()
function makeAssignmentSingleChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(result),
      })),
    })),
    update: vi.fn(() => ({ eq: mockAssignmentUpdateEq })),
  };
}

// sibling assignments select: .select('id').eq('problem_id', ...).eq('student_id', ...)
function makeSiblingAssignmentsChain(data: unknown[]) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data, error: null }),
      })),
    })),
    update: vi.fn(() => ({ eq: mockAssignmentUpdateEq })),
  };
}

// recent submissions: .select('is_correct').in(...).order(...).limit(2)
function makeSubmissionsChain(opts: {
  insertResult?: { error: null | { message: string } };
  recentData?: unknown[];
}) {
  return {
    insert: vi.fn().mockResolvedValue(opts.insertResult ?? { error: null }),
    select: vi.fn(() => ({
      in: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: opts.recentData ?? [], error: null }),
        })),
      })),
    })),
  };
}

const supabaseMock = {
  auth: { getUser: mockGetUser },
  storage: { from: vi.fn(() => ({ upload: mockUpload })) },
  from: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(supabaseMock)),
}));

const adminMockFrom = vi.fn(() => ({
  select: vi.fn(() => ({
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  })),
  update: vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })),
  insert: vi.fn(() => ({
    select: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({ from: adminMockFrom })),
}));

vi.mock('@/lib/ai/generate-variant', () => ({
  generateVariant: vi.fn().mockResolvedValue({ statement: 'test', answer: '1' }),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

import { POST } from '../route';

function makeFormData(fields: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    fd.append(k, v);
  }
  return fd;
}

function makeRequest(fd: FormData): Request {
  return { formData: () => Promise.resolve(fd) } as unknown as Request;
}

const validAssignment = {
  id: 'assign-uuid',
  student_id: 'student-row-uuid',
  problem_id: 'problem-uuid',
  students: { profile_id: 'user-uuid' },
  problems: { answer: '42' },
  problem_variants: null,
};

function setupFromMock(opts: {
  profileRole: string;
  assignmentResult: { data: unknown; error: unknown };
  recentSubmissions?: { is_correct: boolean | null }[];
}) {
  // Track how many times 'assignments' has been called to differentiate queries
  let assignmentCallCount = 0;

  supabaseMock.from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return makeProfileChain(
        vi.fn().mockResolvedValue({ data: { role: opts.profileRole } }),
      );
    }
    if (table === 'assignments') {
      assignmentCallCount++;
      if (assignmentCallCount === 1) {
        // First call: single assignment fetch
        return makeAssignmentSingleChain(opts.assignmentResult);
      }
      // Second call: sibling assignments for consecutive check (status update now uses admin client)
      return makeSiblingAssignmentsChain([{ id: 'assign-uuid' }]);
    }
    if (table === 'submissions') {
      return makeSubmissionsChain({
        recentData: opts.recentSubmissions ?? [],
      });
    }
    return {};
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockAssignmentUpdateEq.mockResolvedValue({ error: null });
});

describe('POST /api/student/submissions', () => {
  it('returns 401 when not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([1])], 'drawing.png', { type: 'image/png' }),
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not student role', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'teacher',
      assignmentResult: { data: null, error: null },
    });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([1])], 'drawing.png', { type: 'image/png' }),
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(403);
  });

  it('returns 400 when assignment_id is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: null, error: null },
    });

    const fd = makeFormData({
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([1])], 'drawing.png', { type: 'image/png' }),
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it('returns 400 when strokes_json file is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: null, error: null },
    });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      drawing_png: new File([new Uint8Array([1])], 'drawing.png', { type: 'image/png' }),
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(400);
  });

  it('returns 403 when assignment does not belong to student', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: null, error: { message: 'not found' } },
    });

    const fd = makeFormData({
      assignment_id: 'other-assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([1])], 'drawing.png', { type: 'image/png' }),
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(403);
  });

  it('returns 201 with grading result on success for correct answer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: validAssignment, error: null },
      recentSubmissions: [{ is_correct: true }],
    });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([137, 80])], 'drawing.png', { type: 'image/png' }),
      student_answer: '42',
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');
    expect(body.is_correct).toBe(true);
    expect(body.correct_answer).toBeNull();
    expect(typeof body.consecutive_correct).toBe('number');

    expect(mockUpload).toHaveBeenCalledTimes(2);
  });

  it('marks is_correct false and returns correct_answer for wrong answer', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: validAssignment, error: null },
      recentSubmissions: [{ is_correct: false }],
    });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([137, 80])], 'drawing.png', { type: 'image/png' }),
      student_answer: '99',
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.is_correct).toBe(false);
    expect(body.correct_answer).toBe('42');
  });

  it('sets passed=true when 2 consecutive correct submissions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: validAssignment, error: null },
      recentSubmissions: [{ is_correct: true }, { is_correct: true }],
    });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([137, 80])], 'drawing.png', { type: 'image/png' }),
      student_answer: '42',
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.passed).toBe(true);
    expect(body.consecutive_correct).toBe(2);
  });
});
