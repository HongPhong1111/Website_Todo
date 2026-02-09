// pages/ProjectBoard.jsx
import React, { useState, useEffect } from "react";
import { Container, Spinner, Alert } from "react-bootstrap";
import KanbanBoard from "./KanbanBoard";
import { api } from "../../api/client"; // Import api từ services/api.js

const ProjectBoard = ({ projectId }) => {
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);

      // Fetch project và tasks song song
      const [projectData] = await Promise.all([
        api.get(`/api/projects/${projectId}`), // Sử dụng api.get thay vì fetch
      ]);

      console.log("Project Data:", projectData.data?.data || projectData);

      // Cập nhật state
      setProject(projectData.data?.data || projectData);
    } catch (err) {
      setError(err.message || "Failed to load project data");
      console.error("Error fetching project data:", err);
    } finally {
      setLoading(false);
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
      <KanbanBoard project={project} />
    </Container>
  );
};

export default ProjectBoard;
