// controllers/columnController.js
const Column = require("../models/Column");
const Task = require("../models/Task");

class ColumnController {
  // Cập nhật vị trí của nhiều cột
  static async updateColumnPositions(req, res) {
    try {
      const { projectId, updates } = req.body;

      console.log("Update column positions request:", { projectId, updates });

      if (!projectId || !updates || !Array.isArray(updates)) {
        return res.status(400).json({
          success: false,
          message: "projectId và updates array là bắt buộc",
        });
      }

      // Kiểm tra xem tất cả cột có thuộc về project này không
      const columnIds = updates.map((update) => update.columnId);
      const columns = await Column.find({
        _id: { $in: columnIds },
        projectId: projectId,
        isDeleted: false,
      });

      console.log("Found columns:", columns.length);

      if (columns.length !== updates.length) {
        return res.status(400).json({
          success: false,
          message: "Một số cột không thuộc về project này hoặc đã bị xóa",
          found: columns.length,
          requested: updates.length,
        });
      }

      // Cập nhật vị trí cho từng cột
      const updatePromises = updates.map(async (update) => {
        return Column.findByIdAndUpdate(
          update.columnId,
          {
            position: update.position,
            updatedAt: Date.now(),
          },
          { new: true },
        );
      });

      const updatedColumns = await Promise.all(updatePromises);

      const io = req.app.get("io");
      if (io) {
        io.to(`project-${projectId}`).emit("columns-reordered-broadcast", {
          columns: updatedColumns,
          reorderedBy: "server",
        });
      }

      console.log("Updated columns successfully:", updatedColumns.length);

      res.status(200).json({
        success: true,
        message: "Vị trí cột đã được cập nhật thành công",
        data: updatedColumns,
      });
    } catch (error) {
      console.error("Error updating column positions:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật vị trí cột",
        error: error.message,
      });
    }
  }

  // Lấy tất cả cột của một project
  static async getColumnsByProject(req, res) {
    try {
      const { projectId } = req.params;

      console.log("Getting columns for project:", projectId);

      const columns = await Column.find({
        projectId: projectId,
        isDeleted: false,
      })
        .sort({ position: 1 })
        .select("-isDeleted -isArchived -__v");

      console.log("Found columns:", columns.length);

      res.status(200).json({
        success: true,
        data: columns,
        count: columns.length,
      });
    } catch (error) {
      console.error("Error getting columns:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi lấy danh sách cột",
        error: error.message,
      });
    }
  }

  // Tạo cột mới
  static async createColumn(req, res) {
    try {
      const { projectId, name, color = "#043dfb" } = req.body;

      console.log("Creating column:", { projectId, name, color });

      if (!projectId || !name) {
        return res.status(400).json({
          success: false,
          message: "projectId và name là bắt buộc",
        });
      }

      // Tìm vị trí cao nhất hiện tại
      const lastColumn = await Column.findOne({
        projectId: projectId,
        isDeleted: false,
      })
        .sort({ position: -1 })
        .limit(1);

      const position = lastColumn ? lastColumn.position + 1 : 0;

      const column = new Column({
        name,
        color: color || "#043dfb",
        position,
        projectId,
        isDeleted: false,
        isArchived: false,
      });

      // Phát sự kiện qua Socket.IO
      const io = req.app.get("io");
      if (io) {
        io.to(`project-${projectId}`).emit("column-created-broadcast", {
          column: column.toObject(),
          createdBy: "server",
        });
      }
      await column.save();

      const columnResponse = column.toObject();
      delete columnResponse.isDeleted;
      delete columnResponse.isArchived;
      delete columnResponse.__v;

      console.log("Column created successfully:", columnResponse._id);

      res.status(201).json({
        success: true,
        message: "Cột đã được tạo thành công",
        data: columnResponse,
      });
    } catch (error) {
      console.error("Error creating column:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi tạo cột",
        error: error.message,
      });
    }
  }

  // Cập nhật cột
  static async updateColumn(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      console.log("Updating column:", id, updates);

      // Không cho phép cập nhật các trường hệ thống
      delete updates.projectId;
      delete updates.createdAt;
      delete updates.isDeleted;
      delete updates.isArchived;

      const column = await Column.findOneAndUpdate(
        {
          _id: id,
          isDeleted: false,
        },
        {
          ...updates,
          updatedAt: Date.now(),
        },
        { new: true, runValidators: true },
      ).select("-isDeleted -isArchived -__v");

      if (!column) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cột",
        });
      }

      // Phát sự kiện qua Socket.IO
      const io = req.app.get("io");
      if (io) {
        io.to(`project-${column.projectId}`).emit("column-changed-broadcast", {
          columnId: column._id,
          updates: updates,
          updatedBy: "server",
        });
      }

      console.log("Column updated successfully");

      res.status(200).json({
        success: true,
        message: "Cột đã được cập nhật thành công",
        data: column,
      });
    } catch (error) {
      console.error("Error updating column:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi cập nhật cột",
        error: error.message,
      });
    }
  }

  // Xóa cột (soft delete)
  static async deleteColumn(req, res) {
    try {
      const { id } = req.params;

      console.log("Deleting column:", id);

      // Kiểm tra xem cột có tồn tại không
      const column = await Column.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!column) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cột",
        });
      }

      // Kiểm tra xem cột có task nào không (nếu có model Task)

      const taskCount = await Task.countDocuments({
        columnId: id,
        isDeleted: false,
      });

      if (taskCount > 0) {
        return res.status(400).json({
          success: false,
          message: "Không thể xóa cột có chứa task",
          taskCount,
        });
      }

      // Soft delete - đánh dấu là đã xóa
      column.isDeleted = true;
      column.updatedAt = Date.now();

      // Phát sự kiện qua Socket.IO
      const io = req.app.get("io");
      if (io) {
        io.to(`project-${column.projectId}`).emit("column-deleted-broadcast", {
          // gửi  ,  nhận diện sự kiện ở client
          columnId: column._id,
          deletedBy: "server",
        });
      }

      await column.save();

      console.log("Column soft deleted successfully");

      res.status(200).json({
        success: true,
        message: "Cột đã được xóa thành công",
      });
    } catch (error) {
      console.error("Error deleting column:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi xóa cột",
        error: error.message,
      });
    }
  }

  // Khôi phục cột đã xóa
  static async restoreColumn(req, res) {
    try {
      const { id } = req.params;

      const column = await Column.findByIdAndUpdate(
        id,
        {
          isDeleted: false,
          updatedAt: Date.now(),
        },
        { new: true },
      );

      if (!column) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy cột",
        });
      }

      res.status(200).json({
        success: true,
        message: "Cột đã được khôi phục thành công",
        data: column,
      });
    } catch (error) {
      console.error("Error restoring column:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi khôi phục cột",
        error: error.message,
      });
    }
  }
}

module.exports = ColumnController;
