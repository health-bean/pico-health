"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminChatPanel } from "@/components/admin/admin-chat-panel";
import { useState } from "react";
import { MessageSquare, X } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-[calc(100dvh-64px)] flex-col md:flex-row">
      {/* Sidebar on wide screens, a scrolling strip on phones */}
      <AdminSidebar />

      {/* Main content: min-w-0 keeps a wide table from stretching the viewport */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto p-4 pb-24 md:p-6 md:pb-6">{children}</div>

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
            className="fixed bottom-24 right-4 flex min-h-11 items-center gap-2 rounded-full bg-teal-600 px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-float)] transition-colors hover:bg-teal-700 md:bottom-4"
          >
            <MessageSquare className="h-4 w-4" />
            AI Assistant
          </button>
        )}
      </div>
    </div>
  );
}
