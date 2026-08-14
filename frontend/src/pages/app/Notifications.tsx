import { Bell } from "lucide-react";

export function Notifications() {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Notifications</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          You're all caught up.
        </p>
      </div>
      <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Bell className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">No notifications yet</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          When someone bookmarks or comments on your projects, you'll see it here.
        </p>
      </div>
    </div>
  );
}