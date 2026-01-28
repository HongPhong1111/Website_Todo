// pages/ProjectBoard.jsx
import React, { useState, useEffect } from "react";
import { Container, Spinner, Alert } from "react-bootstrap";
import KanbanBoard from "./KanbanBoard";
import { api } from "../../api/client"; // Import api từ services/api.js

const ProjectBoard = ({ projectId }) => {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project và tasks song song
      const [projectData, tasksData] = await Promise.all([
        api.get(`/api/projects/${projectId}`), // Sử dụng api.get thay vì fetch
        api.get(`/api/tasks/by-project/${projectId}`),
      ]);

      console.log("Project Data:", projectData.data);
      console.log("Tasks Data:", tasksData.data);

      // Cập nhật state
      setProject(projectData.data || projectData);
      setTasks(tasksData.data || tasksData || []);
    } catch (err) {
      setError(err.message || "Failed to load project data");
      console.error("Error fetching project data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskCreate = async (task, status) => {
    try {
      const response = await api.post("/tasks", {
        ...task,
        project: projectId,
        status,
      });

      const newTask = response.data || response;

      // Update local state
      setTasks([...tasks, newTask]);

      // Cập nhật project statistics
      if (project && project.statistics) {
        setProject({
          ...project,
          statistics: {
            ...project.statistics,
            taskCount: project.statistics.taskCount + 1,
          },
        });
      }

      return newTask;
    } catch (err) {
      console.error("Failed to create task:", err);
      throw err;
    }
  };

  const handleTaskMove = async (taskId, newStatus) => {
    try {
      await api.patch(`/tasks/${taskId}`, {
        status: newStatus,
        ...(newStatus === "done" && {
          metadata: {
            completionDate: new Date(),
          },
        }),
      });

      // Update local state
      const updatedTasks = tasks.map((task) =>
        task._id === taskId
          ? {
              ...task,
              status: newStatus,
              ...(newStatus === "done" && {
                metadata: {
                  ...task.metadata,
                  completionDate: new Date(),
                },
              }),
            }
          : task,
      );

      setTasks(updatedTasks);

      // Cập nhật project statistics nếu task được chuyển sang done
      if (newStatus === "done") {
        const completedTasks = updatedTasks.filter(
          (t) => t.status === "done",
        ).length;
        if (project && project.statistics) {
          setProject({
            ...project,
            statistics: {
              ...project.statistics,
              completedTasks,
              lastActivity: new Date(),
            },
          });
        }
      }

      return true;
    } catch (err) {
      console.error("Failed to move task:", err);
      throw err;
    }
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      const response = await api.patch(`/tasks/${taskId}`, updates);
      const updatedTask = response.data || response;

      // Update local state
      setTasks(
        tasks.map((task) =>
          task._id === taskId ? { ...task, ...updatedTask } : task,
        ),
      );

      return updatedTask;
    } catch (err) {
      console.error("Failed to update task:", err);
      throw err;
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);

      // Update local state
      setTasks(tasks.filter((task) => task._id !== taskId));

      // Cập nhật project statistics
      if (project && project.statistics) {
        const remainingTasks = tasks.filter((t) => t._id !== taskId);
        const completedTasks = remainingTasks.filter(
          (t) => t.status === "done",
        ).length;

        setProject({
          ...project,
          statistics: {
            ...project.statistics,
            taskCount: remainingTasks.length,
            completedTasks,
            lastActivity: new Date(),
          },
        });
      }

      return true;
    } catch (err) {
      console.error("Failed to delete task:", err);
      throw err;
    }
  };

  const refreshData = () => {
    fetchProjectData();
  };

  if (loading) {
    return (
      <Container
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "400px" }}
      >
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading project board...</span>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error loading project</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={refreshData}>
              Retry
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Project not found</Alert.Heading>
          <p>
            The project you are looking for does not exist or you don't have
            permission to access it.
          </p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <KanbanBoard
        project={project}
        tasks={tasks}
        onTaskCreate={handleTaskCreate}
        onTaskMove={handleTaskMove}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
        onRefresh={refreshData}
        loading={loading}
      />
    </Container>
  );
};

export default ProjectBoard;
