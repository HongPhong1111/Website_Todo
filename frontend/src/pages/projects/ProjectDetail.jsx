import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import ProjectBoard from "../../components/Kanban/ProjectBoard";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MinimalAddMember from "../../components/MinimalAddMember";
import { Users, Plus, Settings, User } from "lucide-react";

export default function ProjectDetail() {
  const { id } = useParams();
  const projectId = id;

  console.log("ProjectDetail component loaded id: ", projectId);

  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [projectCurrent, setProjectCurrent] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Loading project data for projectId:", projectId);

      //load project current
      const projectRes = await api.get(`/api/projects/${projectId}`);

      console.log("Project response:", projectRes.data);

      setProjectCurrent(projectRes.data.data);

      // Load tasks first
      const tasksRes = await api.get(`/api/tasks/by-project/${projectId}`);
      console.log("Tasks response:", tasksRes.data);
      setTasks(tasksRes.data.data || []);

      // Load members separately to avoid one failure breaking everything
      try {
        const projectRes = await api.get(`/api/projects/${projectId}/members`);

        setMembers(projectRes.data.data || []);
      } catch (membersError) {
        console.error("Failed to load members:", membersError);
        setMembers([]); // Set empty array as fallback
      }
    } catch (error) {
      console.error("Failed to load project data:", error);
      // Set fallback data to prevent white screen
      setTasks([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await load();
    })();
  }, [load, projectId]);

  const getStatusVariant = (status) => {
    switch (status) {
      case "todo":
        return "secondary";
      case "in_progress":
        return "default";
      case "done":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-500">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            {/* Project #{projectId} */}
            Tên dự án: {projectCurrent.name || "Unknown"}
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Quản lý các nhiệm vụ và theo dõi tiến độ của dự án này.
          </p>
        </div>
      </div>
      {/* Members Section */}
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle>Thành viên dự án</CardTitle>
          </div>
          <CardDescription>
            {members.length} thành viên{members.length !== 1 ? "s" : ""} in this
            project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Current Members */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Thành viên hiện tại:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName || member.email}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {member.fullName || "Unknown User"}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {member.email}
                    </p>
                  </div>
                  <Badge
                    variant={member.role === "owner" ? "default" : "secondary"}
                  >
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Add New Members */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Thêm thành viên mới:
            </h4>
            <MinimalAddMember
              projectId={projectId}
              project={projectCurrent}
              onMemberAdded={() => {
                // Reload members when new member is added
                load();
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tasks</CardTitle>
          <CardDescription>
            {tasks.length} task{tasks.length !== 1 ? "s" : ""} in this project
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No tasks yet. Create your first task!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  onClick={() => (window.location.href = `/tasks/${t.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <span className="text-sm font-medium text-gray-500">
                        #{t.id}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/tasks/${t.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-primary"
                      >
                        {t.title}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusVariant(t.status)}>
                      {t.status}
                    </Badge>
                    <span className="text-sm text-gray-500">→</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectBoard projectId={projectId} />
    </div>
  );
}
