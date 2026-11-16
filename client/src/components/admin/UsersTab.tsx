import { useCallback, useEffect, useState } from "react";
import {
  AdminUser, LinkType, UserFields, deleteUser, disableUser, enableUser, forceLogout, issueUserLink, listUsers, updateUser,
} from "@/api/admin";
import { useAuth } from "@/auth/AuthContext";
import ConfirmDialog from "../ConfirmDialog";
import { toast } from "@/lib/toast";
import { ADMIN_TEXT } from "@/lib/strings";
import CreateUserForm from "./CreateUserForm";
import LinkDialog from "./LinkDialog";
import UsersTable, { UserAction } from "./UsersTable";
import { DeleteUserDialog, EditUserDialog } from "./UserDialogs";

type Pending = { action: "disable" | "logout"; user: AdminUser } | null;

const errorText = (err: unknown) => (err instanceof Error && err.message) || ADMIN_TEXT.actionFailed;

export default function UsersTab() {
  const { username } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [link, setLink] = useState<{ type: LinkType; url: string } | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [pending, setPending] = useState<Pending>(null);

  const reload = useCallback(() => {
    listUsers()
      .then((data) => {
        setUsers(data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, []);
  useEffect(reload, [reload]);

  // Runs an action, toasts the outcome, and refreshes the list.
  async function run(fn: () => Promise<unknown>, successToast = true) {
    try {
      await fn();
      if (successToast) toast(ADMIN_TEXT.actionDone, "success");
      reload();
    } catch (err) {
      toast(errorText(err));
    }
  }

  function handleAction(action: UserAction, user: AdminUser) {
    if (action === "edit") setEditing(user);
    else if (action === "delete") setDeleting(user);
    else if (action === "disable" || action === "logout") setPending({ action, user });
    else if (action === "enable") void run(() => enableUser(user.id));
    else if (action === "link") {
      void run(async () => {
        const res = await issueUserLink(user.id);
        setLink({ type: res.type, url: res.link });
      }, false);
    }
  }

  async function saveEdit(user: AdminUser, fields: UserFields) {
    await run(async () => {
      await updateUser(user.id, fields);
      setEditing(null);
    });
  }

  async function confirmDelete(user: AdminUser, confirm: string) {
    await run(async () => {
      await deleteUser(user.id, confirm);
      setDeleting(null);
    });
  }

  function confirmPending() {
    if (!pending) return;
    const { action, user } = pending;
    setPending(null);
    void run(() => (action === "disable" ? disableUser(user.id) : forceLogout(user.id)));
  }

  return (
    <div className="space-y-4 p-5">
      <CreateUserForm onCreated={(url) => { setLink({ type: "invite", url }); reload(); }} />
      {loadError && <p className="text-sm text-destructive" role="alert">{ADMIN_TEXT.loadFailed}</p>}
      {!users && !loadError && <p className="text-sm text-muted-foreground">{ADMIN_TEXT.loading}</p>}
      {users && <UsersTable users={users} currentUsername={username} onAction={handleAction} />}

      <LinkDialog link={link} onClose={() => setLink(null)} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} onSave={saveEdit} />
      <DeleteUserDialog user={deleting} onClose={() => setDeleting(null)} onDelete={confirmDelete} />
      <ConfirmDialog
        open={!!pending}
        message={pending ? (pending.action === "disable" ? ADMIN_TEXT.confirmDisable : ADMIN_TEXT.confirmLogout)(pending.user.username) : ""}
        confirmLabel={ADMIN_TEXT.confirmAction}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
