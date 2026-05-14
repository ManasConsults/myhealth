"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserManagement } from "@/components/admin/UserManagement";
import { GlobalSettingsPanel } from "@/components/admin/GlobalSettings";
import { ExerciseLibraryManager } from "@/components/admin/ExerciseLibraryManager";
import { useAuth } from "@/lib/auth-context";
import { fetchAllUsers, fetchSettings, fetchExerciseLibrary } from "@/lib/actions";
import { ExerciseLibrary, GlobalSettings, UserProfile } from "@/lib/types";

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [library, setLibrary] = useState<ExerciseLibrary[]>([]);

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      void fetchAllUsers().then(setUsers);
      void fetchSettings().then(setSettings);
      void fetchExerciseLibrary().then(setLibrary);
    }
  }, [user]);

  if (!user || user.role !== "admin" || !settings) return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground text-sm">Platform management</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users" className="flex-1 sm:flex-none">User Management</TabsTrigger>
          <TabsTrigger value="exercises" className="flex-1 sm:flex-none">Exercise Library</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1 sm:flex-none">Global Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <UserManagement users={users} currentUserId={user.id} onUpdate={() => void fetchAllUsers().then(setUsers)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Exercise Library</CardTitle>
            </CardHeader>
            <CardContent>
              <ExerciseLibraryManager
                library={library}
                onUpdate={() => void fetchExerciseLibrary().then(setLibrary)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Platform Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <GlobalSettingsPanel settings={settings} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
