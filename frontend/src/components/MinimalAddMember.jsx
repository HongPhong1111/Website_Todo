import { useState } from "react";
import { api } from "../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MinimalAddMember({
  projectId,
  onMemberAdded,
  project,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(
        `/api/projects/users/search?q=${searchQuery}`,
      );
      setSearchResults(response.data.data || []);
      setMessage("");
    } catch (error) {
      console.error("Search error:", error);
      setMessage("Search failed");
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    if (selectedUsers.some((u) => u.id === user.id)) {
      return;
    }
    setSelectedUsers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
    setMessage(`Selected: ${user.full_name || user.email}`);
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) {
      setMessage("No users selected");
      return;
    }

    setLoading(true);
    try {
      for (const user of selectedUsers) {
        await api.post(`/api/projects/${projectId}/members`, {
          userId: user.id,
          role: "viewer",
        });
      }

      setMessage(`Successfully added ${selectedUsers.length} members!`);
      setSelectedUsers([]);
      if (onMemberAdded) {
        onMemberAdded();
      }
    } catch (error) {
      console.error("Add members error:", error);
      setMessage(
        `Error: ${error.response?.data?.message || "Failed to add members"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🎯 Thêm thành viên ( {project.name || "Unknown"})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <div className="flex space-x-2">
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? "..." : "Search"}
            </Button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Results:</h4>
            {searchResults.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-2 border rounded"
              >
                <div>
                  <div className="font-medium">
                    {user.full_name || "Unknown"}
                  </div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <Button size="sm" onClick={() => handleSelectUser(user)}>
                  Select
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Selected Users */}
        {selectedUsers.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected ({selectedUsers.length}):</h4>
            <div className="space-y-1">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-2 bg-blue-50 rounded"
                >
                  <span className="text-sm">
                    {user.full_name || user.email}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelectedUsers((prev) =>
                        prev.filter((u) => u.id !== user.id),
                      )
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button
              onClick={handleAddMembers}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Adding..." : `Add ${selectedUsers.length} Members`}
            </Button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className={`p-3 rounded text-sm ${
              message.includes("Error")
                ? "bg-red-100 text-red-700"
                : message.includes("Successfully")
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700"
            }`}
          >
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
