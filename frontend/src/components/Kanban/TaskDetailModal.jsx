import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  User,
  Tag,
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  Paperclip,
  MessageSquare,
  Eye,
} from "lucide-react";
import { toast } from "react-toastify";

const TaskDetailModal = ({ task, onClose, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({});
  const [activeTab, setActiveTab] = useState("details");
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
        tags: Array.isArray(task.tags) ? task.tags.join(", ") : "",
        assignedTo: task.assignedTo || [],
      });

      // Load comments và attachments (giả lập) ////////////////////////////////////////////////////////////////////////////
      setComments([
        {
          id: 1,
          user: "John Doe",
          content: "This task needs more details",
          time: "2 hours ago",
        },
        {
          id: 2,
          user: "Jane Smith",
          content: "I'll work on this tomorrow",
          time: "1 hour ago",
        },
      ]);

      setAttachments(task.attachments || []);
    }
  }, [task]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const updatedData = {
        title: editedTask.title.trim(),
        description: editedTask.description.trim(),
        priority: editedTask.priority,
        dueDate: editedTask.dueDate || null,
        tags: editedTask.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        assignedTo: editedTask.assignedTo,
      };

      await onUpdate(task._id, updatedData);
      setIsEditing(false);
      toast.success("Task updated successfully");
    } catch (error) {
      toast.error("Failed to update task: ", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      onDelete(task._id);
      onClose();
    }
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;

    const newCommentObj = {
      id: comments.length + 1,
      user: "Current User", // Thay bằng user thực tế
      content: newComment,
      time: "Just now",
    };

    setComments([newCommentObj, ...comments]);
    setNewComment("");
    toast.success("Comment added");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No due date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-start">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                className="w-full text-2xl font-bold text-gray-900 border-b border-gray-300 focus:outline-none focus:border-blue-500 py-1"
                value={editedTask.title}
                onChange={(e) =>
                  setEditedTask({ ...editedTask, title: e.target.value })
                }
                autoFocus
              />
            ) : (
              <h3 className="text-2xl font-bold text-gray-900">{task.title}</h3>
            )}
            <div className="flex items-center gap-4 mt-2">
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}
              >
                {task.priority?.toUpperCase() || "MEDIUM"}
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <Calendar size={16} />
                <span>{formatDate(task.dueDate)}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-600">
                <User size={16} />
                <span>
                  {task.assignedTo?.length > 0
                    ? `${task.assignedTo.length} assigned`
                    : "Unassigned"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex space-x-1 px-6">
            <button
              className={`px-4 py-3 font-medium ${activeTab === "details" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("details")}
            >
              Details
            </button>
            <button
              className={`px-4 py-3 font-medium ${activeTab === "comments" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("comments")}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                Comments
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {comments.length}
                </span>
              </div>
            </button>
            <button
              className={`px-4 py-3 font-medium ${activeTab === "attachments" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("attachments")}
            >
              <div className="flex items-center gap-2">
                <Paperclip size={16} />
                Attachments
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                  {attachments.length}
                </span>
              </div>
            </button>
            <button
              className={`px-4 py-3 font-medium ${activeTab === "activity" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500"}`}
              onClick={() => setActiveTab("activity")}
            >
              <div className="flex items-center gap-2">
                <Eye size={16} />
                Activity
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "details" && (
            <div className="space-y-6">
              {/* Description */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-gray-900">Description</h4>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={editedTask.description}
                    onChange={(e) =>
                      setEditedTask({
                        ...editedTask,
                        description: e.target.value,
                      })
                    }
                    placeholder="Add a description..."
                  />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {task.description || "No description provided"}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} />
                      Due Date
                    </div>
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editedTask.dueDate}
                      onChange={(e) =>
                        setEditedTask({
                          ...editedTask,
                          dueDate: e.target.value,
                        })
                      }
                    />
                  ) : (
                    <div className="text-gray-700">
                      {formatDate(task.dueDate)}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Tag size={16} />
                      Tags
                    </div>
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editedTask.tags}
                      onChange={(e) =>
                        setEditedTask({ ...editedTask, tags: e.target.value })
                      }
                      placeholder="Enter tags separated by commas"
                    />
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(task.tags) && task.tags.length > 0 ? (
                        task.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500">No tags</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Time Tracking */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <Clock size={16} />
                      Time Tracking
                    </div>
                  </label>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated:</span>
                      <span className="font-medium">
                        {task.metadata?.estimatedHours || 0}h
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Actual:</span>
                      <span className="font-medium">
                        {task.metadata?.actualHours || 0}h
                      </span>
                    </div>
                  </div>
                </div>

                {/* Created Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Created
                  </label>
                  <div className="space-y-1">
                    <div className="text-gray-600">
                      By:{" "}
                      <span className="font-medium">
                        {task.createdBy?.email || "Unknown"}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm">
                      {task.createdAt
                        ? new Date(task.createdAt).toLocaleDateString()
                        : "Unknown date"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "comments" && (
            <div className="space-y-4">
              {/* New Comment */}
              <div className="border rounded-lg p-4">
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!newComment.trim()}
                  >
                    Add Comment
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium">{comment.user}</div>
                      <div className="text-sm text-gray-500">
                        {comment.time}
                      </div>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "attachments" && (
            <div>
              {attachments.length > 0 ? (
                <div className="space-y-3">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Paperclip size={20} className="text-gray-400" />
                        <div>
                          <div className="font-medium">{file.originalName}</div>
                          <div className="text-sm text-gray-500">
                            {Math.round(file.size / 1024)} KB •{" "}
                            {new Date(file.uploadedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <button className="text-blue-600 hover:text-blue-700">
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Paperclip size={48} className="mx-auto mb-3 text-gray-300" />
                  <p>No attachments yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "activity" && (
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2">Task created</div>
                <div className="font-medium">
                  {task.createdBy?.email || "Unknown user"}
                </div>
                <div className="text-sm text-gray-500">
                  {task.createdAt
                    ? new Date(task.createdAt).toLocaleString()
                    : "Unknown date"}
                </div>
              </div>
              {/* Thêm các activity log khác ở đây */}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between items-center">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading || !editedTask.title.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete Task
              </button>
            )}
          </div>

          {!isEditing && (
            <button
              onClick={() => {
                // Logic để đánh dấu task hoàn thành
                onUpdate(task._id, { status: "done" });
                toast.success("Task marked as completed");
              }}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Mark Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskDetailModal;
