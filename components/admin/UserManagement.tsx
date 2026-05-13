"use client";

import { useState } from "react";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOAL_LABELS, UserProfile, UserRole, UserStatus } from "@/lib/types";
import { approveUser, rejectUser, updateUserRole, updateUserStatus } from "@/lib/actions";

interface Props {
  users: UserProfile[];
  currentUserId: string;
  onUpdate: () => void;
}

const SELECT_CLS = "h-8 rounded-md border border-input bg-transparent px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed";

export function UserManagement({ users, currentUserId, onUpdate }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function run(id: string, action: () => Promise<void>) {
    setLoadingId(id);
    await action();
    onUpdate();
    setLoadingId(null);
  }

  const pending = users.filter((u) => u.status === "pending");

  return (
    <div className="space-y-6">

      {/* ── Pending approval ── */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">Pending Approval</h3>
            <Badge variant="secondary" className="text-xs">{pending.length}</Badge>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.username}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          disabled={loadingId === u.id}
                          onClick={() => run(u.id, () => approveUser(u.id))}
                        >
                          {loadingId === u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 gap-1.5 text-xs"
                          disabled={loadingId === u.id}
                          onClick={() => run(u.id, () => rejectUser(u.id))}
                        >
                          {loadingId === u.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <XCircle className="w-3.5 h-3.5 text-destructive" />}
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── All users ── */}
      <div className="space-y-3">
        {pending.length > 0 && <h3 className="text-sm font-semibold">All Users</h3>}
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Mode</TableHead>
                <TableHead className="hidden md:table-cell">Goal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => {
                const isSelf = u.id === currentUserId;
                const busy = loadingId === u.id;
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.username}</p>
                      {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                    </TableCell>

                    <TableCell>
                      {isSelf ? (
                        <Badge variant="default" className="text-xs">{u.role}</Badge>
                      ) : (
                        <select
                          value={u.role}
                          disabled={busy}
                          className={SELECT_CLS}
                          onChange={(e) => run(u.id, () => updateUserRole(u.id, e.target.value as UserRole))}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      )}
                    </TableCell>

                    <TableCell>
                      {isSelf ? (
                        <Badge variant="outline" className="text-xs">approved</Badge>
                      ) : (
                        <select
                          value={u.status}
                          disabled={busy}
                          className={SELECT_CLS}
                          onChange={(e) => run(u.id, () => updateUserStatus(u.id, e.target.value as UserStatus))}
                        >
                          <option value="pending">pending</option>
                          <option value="approved">approved</option>
                          <option value="rejected">rejected</option>
                        </select>
                      )}
                    </TableCell>

                    <TableCell className="hidden md:table-cell capitalize text-xs text-muted-foreground">
                      {u.planningMode}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                      {u.metrics?.goal ? GOAL_LABELS[u.metrics.goal] : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
