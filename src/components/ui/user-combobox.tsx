"use client";

import { useState } from "react";
import { Check, ChevronDown, Loader2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSearchEmployees } from "@/hooks/documents";

type Employee = {
  id: number;
  name: string | null;
  email: string | null;
  department: string | null;
};

interface UserComboboxProps {
  selectedUsers: Employee[];
  allUsers: Employee[];
  onSelectUser: (user: Employee) => void;
  onRemoveUser: (userId: number) => void;
  disabled?: boolean;
}

export function UserCombobox({
  selectedUsers,
  allUsers,
  onSelectUser,
  onRemoveUser,
  disabled = false,
}: UserComboboxProps) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: searchResults = [], isLoading: isSearching } =
    useSearchEmployees(searchQuery, 8, open && searchQuery.length >= 2);

  const handleSelectUser = (user: Employee) => {
    onSelectUser(user);
    setSearchQuery("");
    setOpen(false);
  };

  const isUserSelected = (userId: number) => {
    return selectedUsers.some((u) => u.id === userId);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              <span className="truncate">
                {selectedUsers.length > 0
                  ? `${selectedUsers.length} user${selectedUsers.length === 1 ? "" : "s"} selected`
                  : "Select users..."}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0" align="start">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search by name or email..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : searchResults.length === 0 && searchQuery.length >= 2 ? (
                  <CommandEmpty>No users found.</CommandEmpty>
                ) : searchResults.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Type to search users...
                  </div>
                ) : (
                  <CommandGroup>
                    {searchResults.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id.toString()}
                        onSelect={() => handleSelectUser(user)}
                        disabled={isUserSelected(user.id)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isUserSelected(user.id)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{user.name || "Unnamed"}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                <div className="border-t p-2">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start"
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Show all users
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Select Users</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-2">
                          {allUsers.map((user) => (
                            <button
                              type="button"
                              key={user.id}
                              className={cn(
                                "flex items-center justify-between rounded-lg border p-3 hover:bg-accent cursor-pointer w-full text-left",
                                isUserSelected(user.id) && "bg-accent",
                              )}
                              onClick={() => {
                                if (!isUserSelected(user.id)) {
                                  handleSelectUser(user);
                                  setDialogOpen(false);
                                }
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <Check
                                  className={cn(
                                    "h-4 w-4",
                                    isUserSelected(user.id)
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                                <div>
                                  <div className="font-medium">
                                    {user.name || "Unnamed"}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                              {user.department && (
                                <Badge variant="outline">
                                  {user.department}
                                </Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                </div>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((user) => (
            <Badge key={user.id} variant="secondary" className="gap-1">
              {user.name || user.email}
              <button
                type="button"
                onClick={() => onRemoveUser(user.id)}
                disabled={disabled}
                className="ml-1 rounded-full hover:bg-muted"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
