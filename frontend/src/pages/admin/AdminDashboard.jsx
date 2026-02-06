import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, LoadingCard } from "@/components/ui/loading";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  FolderOpen,
  CheckSquare,
  TrendingUp,
  Activity,
  Clock,
  Star,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/dashboard");
      setData(res.data);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center mb-8">
          <div className="sm:flex-auto">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {[1, 2, 3].map((i) => (
            <LoadingCard key={i} />
          ))}
        </div>

        <LoadingCard />
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: data.users,
      description: "Registered users in system",
      link: "/admin/users",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
      change: "+12%",
      changeType: "increase",
    },
    {
      title: "Total Projects",
      value: data.projects,
      description: "Active projects",
      link: "/admin/projects",
      icon: FolderOpen,
      color: "text-green-600",
      bgColor: "bg-green-100",
      change: "+8%",
      changeType: "increase",
    },
    {
      title: "Total Tasks",
      value: data.tasks,
      description: "All tasks across projects",
      icon: CheckSquare,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      change: "+23%",
      changeType: "increase",
    },
  ];

  const taskStatusData =
    data.tasksByStatus?.map((item) => ({
      name: item.status.replace("_", " "),
      value: item.cnt,
      color:
        item.status === "done"
          ? "#10B981"
          : item.status === "in_progress"
            ? "#3B82F6"
            : "#6B7280",
    })) || [];

  const recentActivity = [
    { name: "Mon", tasks: 12, projects: 3 },
    { name: "Tue", tasks: 19, projects: 5 },
    { name: "Wed", tasks: 15, projects: 2 },
    { name: "Thu", tasks: 25, projects: 8 },
    { name: "Fri", tasks: 22, projects: 6 },
    { name: "Sat", tasks: 8, projects: 1 },
    { name: "Sun", tasks: 5, projects: 1 },
  ];

  const quickStats = [
    {
      title: "Completion Rate",
      value: "78%",
      description: "Tasks completed this week",
      icon: CheckSquare,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Active Projects",
      value: "12",
      description: "Projects with activity",
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Avg Response Time",
      value: "2.4h",
      description: "Average task response time",
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Satisfaction Score",
      value: "4.8",
      description: "User satisfaction rating",
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
  ];

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, Admin!</h1>
            <p className="mt-2 text-blue-100">
              Here's what's happening with your system today
            </p>
          </div>
          <div className="hidden md:block">
            <Activity className="h-12 w-12 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">
            System Overview
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Real-time metrics and performance indicators
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            onClick={load}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                Refreshing...
              </>
            ) : (
              "Refresh"
            )}
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card
              key={stat.title}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="ml-4">
                      <CardTitle className="text-lg">{stat.title}</CardTitle>
                      <CardDescription>{stat.description}</CardDescription>
                    </div>
                  </div>
                  <div
                    className={`flex items-center text-sm font-medium ${
                      stat.changeType === "increase"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.changeType === "increase" ? (
                      <ArrowUp className="h-4 w-4 mr-1" />
                    ) : (
                      <ArrowDown className="h-4 w-4 mr-1" />
                    )}
                    {stat.change}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline">
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="ml-2 text-sm text-gray-500">
                    {stat.title === "Total Users" && "users"}
                    {stat.title === "Total Projects" && "projects"}
                    {stat.title === "Total Tasks" && "tasks"}
                  </div>
                </div>
                {stat.link && (
                  <Link
                    to={stat.link}
                    className="mt-4 inline-flex items-center text-sm text-primary hover:underline"
                  >
                    View details
                    <TrendingUp className="ml-1 h-4 w-4" />
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Status</CardTitle>
            <CardDescription>
              Distribution of tasks across different statuses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {data.tasksByStatus?.map((item) => {
                const total = data.tasks;
                const percentage =
                  total > 0 ? Math.round((item.cnt / total) * 100) : 0;

                return (
                  <div key={item.status} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge
                          variant={
                            item.status === "done"
                              ? "destructive"
                              : item.status === "in_progress"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {item.status}
                        </Badge>
                        <span className="text-sm font-medium capitalize">
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {item.cnt}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.status === "done"
                            ? "bg-red-500"
                            : item.status === "in_progress"
                              ? "bg-blue-500"
                              : "bg-gray-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Status Distribution</CardTitle>
            <CardDescription>
              Visual breakdown of task completion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Weekly Activity</CardTitle>
          <CardDescription>
            Tasks and projects created over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={recentActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="tasks"
                stroke="#3B82F6"
                strokeWidth={2}
                name="Tasks"
              />
              <Line
                type="monotone"
                dataKey="projects"
                stroke="#10B981"
                strokeWidth={2}
                name="Projects"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
