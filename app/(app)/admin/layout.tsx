"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminChatPanel } from "@/components/admin/admin-chat-panel";
import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-64px)]">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">{children}</div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="border-t border-warm-200 bg-[var(--color-surface-card)]">
            <div className="flex items-center justify-between border-b border-warm-100 px-4 py-2">
              <span className="text-sm font-medium text-warm-700">AI Assistant</span>
              <button
                onClick={() => setChatOpen(false)}
                className="rounded p-1 text-warm-500 hover:bg-warm-100 hover:text-warm-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <AdminChatPanel />
          </div>
        )}

        {/* Chat toggle button */}
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-colors hover:bg-teal-700"
          >
            <MessageSquare className="h-4 w-4" />
            AI Assistant
          </button>
        )}
      </div>
    </div>
  );
}
