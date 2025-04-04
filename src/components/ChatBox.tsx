
import React, { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Paperclip, Send } from 'lucide-react';
import { format } from 'date-fns';
import { ChatType, MessageType, FileAttachment } from '@/lib/types';
import FileAttachmentDisplay from './FileAttachment';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ChatBoxProps {
  chat: ChatType;
  messages: MessageType[];
  onSendMessage: (content: string, attachment?: FileAttachment) => void;
}

const ChatBox = ({ chat, messages, onSendMessage }: ChatBoxProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [filePreview, setFilePreview] = useState<FileAttachment | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newMessage.trim() || filePreview) {
      onSendMessage(newMessage, filePreview || undefined);
      setNewMessage('');
      setFilePreview(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for the file
    const fileUrl = URL.createObjectURL(file);
    
    // Create file attachment object
    const attachment: FileAttachment = {
      id: `file-${Date.now()}`,
      name: file.name,
      type: file.type,
      url: fileUrl,
      size: file.size,
    };

    setFilePreview(attachment);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Mark messages as read
  useEffect(() => {
    const markMessagesAsRead = async () => {
      if (user && messages.length > 0 && chat.id) {
        const unreadMessages = messages.filter(
          msg => !msg.read && msg.senderId !== user.id
        );
        
        if (unreadMessages.length > 0) {
          const messageIds = unreadMessages.map(msg => msg.id);
          
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', messageIds);
        }
      }
    };
    
    markMessagesAsRead();
  }, [messages, user, chat.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up real-time message subscription
  useEffect(() => {
    if (!chat.id) return;
    
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `chat_id=eq.${chat.id}` 
        }, 
        (payload) => {
          console.log('New message received:', payload);
          // The parent component will handle this through the fetchMessages function
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chat.id]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (filePreview?.url) {
        URL.revokeObjectURL(filePreview.url);
      }
    };
  }, [filePreview]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center">
        <Avatar className="mr-3">
          {chat.participantImage ? (
            <AvatarImage src={chat.participantImage} alt={chat.participantName} />
          ) : null}
          <AvatarFallback>
            {chat.participantName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-medium">{chat.participantName}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.senderId === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  message.senderId === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {message.content && <p>{message.content}</p>}
                
                {message.attachment && (
                  <FileAttachmentDisplay file={message.attachment} />
                )}
                
                <div
                  className={`text-xs mt-1 ${
                    message.senderId === user?.id
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  }`}
                >
                  {format(new Date(message.timestamp), 'HH:mm')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t">
        {filePreview && (
          <div className="mb-2">
            <FileAttachmentDisplay file={filePreview} isPreview onRemove={handleRemoveFile} />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx"
          />
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={handleFileSelect}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach file (image, PDF, DOC)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newMessage.trim() && !filePreview}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ChatBox;
