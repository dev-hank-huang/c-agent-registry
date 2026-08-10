import { PlusOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, Modal, Select } from "antd";
import { Eye, Pencil, Search, ShieldCheck, User as UserIcon, UserX, X } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, updateUser } from "../api/users";
import type { CreateUserInput } from "../api/users";
import type { User, UserRole, UserSort, UserStatus } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import Pagination from "../components/Pagination";

const ROLE_OPTIONS: UserRole[] = ["member", "reviewer", "admin"];
const ROLE_ICONS: Record<UserRole, typeof ShieldCheck> = {
  admin: ShieldCheck,
  reviewer: Eye,
  member: UserIcon,
};
const STATUS_OPTIONS: { value: UserStatus | ""; label: string }[] = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];
const SORT_OPTIONS: { value: UserSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "name", label: "Name (A–Z)" },
];

interface DraftEdit {
  name: string;
  role: UserRole;
  status: UserStatus;
}

export default function AdminUsers() {
  const { message } = App.useApp();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [form] = Form.useForm<CreateUserInput>();

  const [q, setQ] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [sort, setSort] = useState<UserSort>("newest");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftEdit | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  function updateFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setOffset(0);
    };
  }

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", q, role, status, sort, limit, offset],
    queryFn: () =>
      listUsers({
        q: q || undefined,
        role: role || undefined,
        status: status || undefined,
        sort,
        limit,
        offset,
      }),
  });

  useEffect(() => {
    setSelected(new Set());
  }, [q, role, status, sort, limit, offset]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      message.success("使用者已建立");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setCreateOpen(false);
      form.resetFields();
    },
    onError: () => message.error("建立失敗，email 可能已被使用"),
  });

  function startEdit(user: User) {
    setEditingId(user.id);
    setDraft({ name: user.name, role: user.role, status: user.status });
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit(user: User) {
    if (!draft) return;
    setBusyId(user.id);
    setError(null);
    try {
      await updateUser(user.id, draft);
      cancelEdit();
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      setError("Failed to update this user.");
    } finally {
      setBusyId(null);
    }
  }

  async function deactivate(user: User) {
    if (!window.confirm(`永久刪除「${user.name}」？此動作無法復原，對方將無法再登入。`)) return;
    setBusyId(user.id);
    setError(null);
    try {
      await deleteUser(user.id);
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {
      setError("Failed to delete this user.");
    } finally {
      setBusyId(null);
    }
  }

  const selectableIds = (data?.items ?? []).filter((u) => u.id !== currentUser?.id).map((u) => u.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(allSelected ? new Set() : new Set(selectableIds));
  }

  async function bulkDeactivate() {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (!window.confirm(`永久刪除選取的 ${ids.length} 位使用者？此動作無法復原。`)) return;
    setBulkBusy(true);
    setError(null);
    const results = await Promise.allSettled(ids.map((id) => deleteUser(id)));
    const failures = results.filter((r) => r.status === "rejected").length;
    if (failures > 0) {
      setError(`已刪除 ${ids.length - failures} / ${ids.length} 位選取的使用者，${failures} 筆失敗。`);
    }
    setSelected(new Set());
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setBulkBusy(false);
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: "var(--p-text-xl)", fontWeight: 700, margin: "0 0 4px" }}>
            Users {data && <span className="badge">{data.total} total</span>}
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)", margin: "0 0 var(--p-space-2)" }}>
            只有系統角色為 admin 的使用者能看到這一頁。新帳號無法自行註冊，只能由 admin 建立。
          </p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
          新增使用者
        </Button>
      </div>

      <div className="filter-bar">
        <div className="filter-search">
          <Search size={16} />
          <input
            className="filter-input"
            placeholder="Search name or email…"
            value={q}
            onChange={(event) => updateFilter(setQ)(event.target.value)}
          />
        </div>
        <select className="filter-select" value={role} onChange={(event) => updateFilter(setRole)(event.target.value as UserRole | "")}>
          <option value="">Any role</option>
          {ROLE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <select className="filter-select" value={status} onChange={(event) => updateFilter(setStatus)(event.target.value as UserStatus | "")}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select className="filter-select" value={sort} onChange={(event) => updateFilter(setSort)(event.target.value as UserSort)}>
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selected.size > 0 && (
        <div className="filter-bar">
          <span style={{ color: "var(--fg-muted)", fontSize: "var(--p-text-sm)" }}>{selected.size} selected</span>
          <button
            type="button"
            className="pagination-btn"
            style={{ color: "var(--status-danger-fg)", borderColor: "var(--status-danger-border)" }}
            disabled={bulkBusy}
            onClick={bulkDeactivate}
          >
            <UserX size={14} /> Delete selected
          </button>
          <button type="button" className="pagination-btn" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {error && <p style={{ color: "var(--status-danger-fg)", fontSize: "var(--p-text-sm)" }}>{error}</p>}

      {isLoading && <div className="loading-state">Loading…</div>}
      {!isLoading && data && data.items.length === 0 && <div className="empty-state">No users match these filters.</div>}

      {!isLoading && data && data.items.length > 0 && (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="col-num">#</th>
                <th>
                  <input type="checkbox" checked={allSelected} disabled={selectableIds.length === 0} onChange={toggleSelectAll} aria-label="Select all" />
                </th>
                <th>Actions</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th className="col-nowrap">Created</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((user, index) => {
                const isEditing = editingId === user.id;
                const isSelf = user.id === currentUser?.id;
                const RoleIcon = ROLE_ICONS[user.role];
                return (
                  <Fragment key={user.id}>
                    <tr>
                      <td className="col-num">{offset + index + 1}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(user.id)}
                          disabled={isSelf}
                          onChange={() => toggleSelected(user.id)}
                          aria-label={`Select ${user.name}`}
                        />
                      </td>
                      <td>
                        <div className="table-actions">
                          {isEditing ? (
                            <>
                              <button type="button" className="pagination-btn" disabled={busyId === user.id} onClick={() => saveEdit(user)}>
                                Save
                              </button>
                              <button type="button" className="pagination-btn" disabled={busyId === user.id} onClick={cancelEdit} title="Cancel">
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="pagination-btn" disabled={isSelf || busyId === user.id} onClick={() => startEdit(user)} title="Edit">
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="pagination-btn"
                                style={{ color: "var(--status-danger-fg)", borderColor: "var(--status-danger-border)" }}
                                disabled={isSelf || busyId === user.id}
                                onClick={() => deactivate(user)}
                                title="Delete"
                              >
                                <UserX size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {isEditing && draft ? (
                          <input className="filter-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                        ) : (
                          <strong>{user.name}</strong>
                        )}
                      </td>
                      <td style={{ color: "var(--fg-muted)" }}>{user.email}</td>
                      <td>
                        {isEditing && draft ? (
                          <select className="filter-select" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}>
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="badge">
                            <RoleIcon size={11} />
                            {user.role}
                          </span>
                        )}
                      </td>
                      <td>
                        {isEditing && draft ? (
                          <select
                            className="filter-select"
                            value={draft.status}
                            onChange={(event) => setDraft({ ...draft, status: event.target.value as UserStatus })}
                          >
                            <option value="active">active</option>
                            <option value="disabled">disabled</option>
                          </select>
                        ) : (
                          <span className={`badge badge-${user.status === "active" ? "success" : "danger"}`}>{user.status}</span>
                        )}
                      </td>
                      <td className="col-nowrap" style={{ color: "var(--fg-subtle)" }}>
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination total={data.total} limit={data.limit} offset={offset} onOffsetChange={setOffset} onLimitChange={setLimit} />}

      <Modal
        title="新增使用者"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
        okText="建立"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" onFinish={(v) => createMutation.mutate(v)} initialValues={{ role: "member" }}>
          <Form.Item label="姓名" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="初始密碼" name="password" rules={[{ required: true, min: 8, message: "至少 8 個字元" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item label="系統角色" name="role" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "member", label: "member" },
                { value: "reviewer", label: "reviewer" },
                { value: "admin", label: "admin" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
