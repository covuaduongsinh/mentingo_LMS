import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useMarkConversationRead } from "~/api/mutations/useMarkConversationRead";
import { useSendCommunityMessage } from "~/api/mutations/useSendCommunityMessage";
import { useCommunityConversationMessages } from "~/api/queries/useCommunityConversationMessages";
import { useCommunityConversations } from "~/api/queries/useCommunityConversations";
import { useCommunityMessageableUsers } from "~/api/queries/useCommunityMessageableUsers";
import { useCurrentUser } from "~/api/queries/useCurrentUser";
import { PageWrapper } from "~/components/PageWrapper";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { setPageTitle } from "~/utils/setPageTitle";

import type { MetaFunction } from "@remix-run/react";

export const meta: MetaFunction = ({ matches }) => setPageTitle(matches, "pages.communityMessages");

function initialsOf(firstName: string, lastName: string) {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export default function CommunityMessagesPage() {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedNewRecipient, setSelectedNewRecipient] = useState<{
    userId: string;
    firstName: string;
    lastName: string;
  } | null>(null);
  const [draft, setDraft] = useState("");

  const { data: conversations, isLoading: isLoadingConversations } = useCommunityConversations();
  const { data: messageableUsers } = useCommunityMessageableUsers();
  const { data: messages } = useCommunityConversationMessages(selectedConversationId ?? undefined);
  const sendMessage = useSendCommunityMessage();
  const markRead = useMarkConversationRead();

  const breadcrumbs = [
    {
      title: t("communityView.messages.title", { defaultValue: "Messages" }),
      href: "/community/messages",
    },
  ];

  const handleSelectConversation = (conversationId: string) => {
    setSelectedNewRecipient(null);
    setSelectedConversationId(conversationId);
    markRead.mutate(conversationId);
  };

  const handleSelectNewRecipient = (user: {
    userId: string;
    firstName: string;
    lastName: string;
  }) => {
    setSelectedConversationId(null);
    setSelectedNewRecipient(user);
  };

  const handleSend = () => {
    const recipientUserId = selectedNewRecipient
      ? selectedNewRecipient.userId
      : conversations?.data.find((c) => c.id === selectedConversationId)?.otherUser.userId;
    if (!recipientUserId || !draft.trim()) return;

    sendMessage.mutate(
      { recipientUserId, content: draft.trim() },
      {
        onSuccess: (message) => {
          setDraft("");
          setSelectedNewRecipient(null);
          setSelectedConversationId(message.conversationId);
        },
      },
    );
  };

  const activeOtherUser = selectedNewRecipient
    ? selectedNewRecipient
    : conversations?.data.find((c) => c.id === selectedConversationId)?.otherUser;

  return (
    <PageWrapper breadcrumbs={breadcrumbs}>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="flex flex-col gap-4 md:col-span-1">
          <div className="rounded-lg border border-neutral-200 bg-white">
            <h2 className="border-b border-neutral-100 p-3 text-sm font-medium text-neutral-600">
              {t("communityView.messages.conversations", { defaultValue: "Conversations" })}
            </h2>
            {isLoadingConversations ? (
              <p className="p-3 text-sm text-neutral-500">
                {t("common.loading", { defaultValue: "Loading…" })}
              </p>
            ) : conversations?.data.length === 0 ? (
              <p className="p-3 text-sm text-neutral-500">
                {t("communityView.messages.noConversations", {
                  defaultValue: "No conversations yet.",
                })}
              </p>
            ) : (
              conversations?.data.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => handleSelectConversation(conversation.id)}
                  className={`flex w-full items-center gap-2 border-b border-neutral-100 p-3 text-left last:border-b-0 hover:bg-neutral-50 ${
                    selectedConversationId === conversation.id ? "bg-neutral-50" : ""
                  }`}
                >
                  <Avatar className="size-8">
                    <AvatarImage src={conversation.otherUser.avatarUrl ?? undefined} />
                    <AvatarFallback>
                      {initialsOf(
                        conversation.otherUser.firstName,
                        conversation.otherUser.lastName,
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {conversation.otherUser.firstName} {conversation.otherUser.lastName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {conversation.lastMessagePreview ?? ""}
                    </p>
                  </div>
                  {conversation.unreadCount > 0 && (
                    <Badge variant="default">{conversation.unreadCount}</Badge>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="rounded-lg border border-neutral-200 bg-white">
            <h2 className="border-b border-neutral-100 p-3 text-sm font-medium text-neutral-600">
              {t("communityView.messages.startNew", { defaultValue: "Start a new conversation" })}
            </h2>
            {messageableUsers?.length === 0 ? (
              <p className="p-3 text-sm text-neutral-500">
                {t("communityView.messages.noContacts", {
                  defaultValue: "No suggested contacts yet.",
                })}
              </p>
            ) : (
              messageableUsers?.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => handleSelectNewRecipient(user)}
                  className="flex w-full items-center gap-2 border-b border-neutral-100 p-3 text-left last:border-b-0 hover:bg-neutral-50"
                >
                  <Avatar className="size-8">
                    <AvatarImage src={user.avatarUrl ?? undefined} />
                    <AvatarFallback>{initialsOf(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm text-neutral-900">
                    {user.firstName} {user.lastName}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 md:col-span-2">
          {!activeOtherUser ? (
            <p className="text-sm text-neutral-500">
              {t("communityView.messages.selectPrompt", {
                defaultValue: "Select a conversation or a contact to start chatting.",
              })}
            </p>
          ) : (
            <>
              <h2 className="body-lg-md text-neutral-950">
                {activeOtherUser.firstName} {activeOtherUser.lastName}
              </h2>
              <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
                {messages?.data.map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      message.senderId === currentUser?.id
                        ? "self-end bg-primary-100 text-primary-900"
                        : "self-start bg-neutral-100 text-neutral-900"
                    }`}
                  >
                    {message.content}
                  </div>
                ))}
              </div>
              <div className="mt-auto flex gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  placeholder={t("communityView.messages.placeholder", {
                    defaultValue: "Write a message…",
                  })}
                />
                <Button
                  type="button"
                  disabled={!draft.trim() || sendMessage.isPending}
                  onClick={handleSend}
                >
                  {t("communityView.messages.send", { defaultValue: "Send" })}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
