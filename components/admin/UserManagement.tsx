"use client";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GOAL_LABELS, UserProfile } from "@/lib/types";

interface Props {
  users: UserProfile[];
}

export function UserManagement({ users }: Props) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Username</TableHead>
          <TableHead>Role</TableHead>
          <TableHead className="hidden sm:table-cell">Mode</TableHead>
          <TableHead className="hidden md:table-cell">Goal</TableHead>
          <TableHead className="hidden md:table-cell">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.username}</TableCell>
            <TableCell>
              <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                {u.role}
              </Badge>
            </TableCell>
            <TableCell className="hidden sm:table-cell capitalize text-sm text-muted-foreground">
              {u.planningMode}
            </TableCell>
            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
              {u.metrics?.goal ? GOAL_LABELS[u.metrics.goal] : "—"}
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Badge variant={u.onboardingComplete ? "outline" : "destructive"} className="text-xs">
                {u.onboardingComplete ? "Active" : "Pending"}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
