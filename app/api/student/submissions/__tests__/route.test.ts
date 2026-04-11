import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn();
const mockGetUser = vi.fn();
const mockUpdateEq = vi.fn();

function makeProfileChain(singleFn: ReturnType<typeof vi.fn>) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: singleFn })),
    })),
  };
}

function makeAssignmentChain(
  singleResult: { data: unknown; error: unknown },
  updateEqFn: ReturnType<typeof vi.fn>,
) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue(singleResult),
      })),
    })),
    update: vi.fn(() => ({ eq: updateEqFn })),
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
  students: { profile_id: 'user-uuid' },
};

const mockInsertSuccess = vi.fn().mockResolvedValue({ error: null });

function setupFromMock(opts: {
  profileRole: string;
  assignmentResult: { data: unknown; error: unknown };
}) {
  supabaseMock.from = vi.fn((table: string) => {
    if (table === 'profiles') {
      return makeProfileChain(
        vi.fn().mockResolvedValue({ data: { role: opts.profileRole } }),
      );
    }
    if (table === 'assignments') {
      return makeAssignmentChain(opts.assignmentResult, mockUpdateEq);
    }
    if (table === 'submissions') {
      return { insert: mockInsertSuccess };
    }
    return {};
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUpload.mockResolvedValue({ error: null });
  mockInsertSuccess.mockResolvedValue({ error: null });
  mockUpdateEq.mockResolvedValue({ error: null });
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

  it('returns 201 with id on success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-uuid' } } });
    setupFromMock({
      profileRole: 'student',
      assignmentResult: { data: validAssignment, error: null },
    });

    const fd = makeFormData({
      assignment_id: 'assign-uuid',
      strokes_json: new File(['[]'], 'strokes.json', { type: 'application/json' }),
      drawing_png: new File([new Uint8Array([137, 80])], 'drawing.png', { type: 'image/png' }),
    });

    const res = await POST(makeRequest(fd));
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(typeof body.id).toBe('string');

    expect(mockUpload).toHaveBeenCalledTimes(2);
    expect(mockInsertSuccess).toHaveBeenCalledTimes(1);
  });
});
