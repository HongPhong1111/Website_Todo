const columnSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true,
  },
  name: { type: String, required: true },
  position: { type: Number, required: true }, // thứ tự cột
  createdAt: { type: Date, default: Date.now },
  color: { type: String, default: "#FFFFFF" },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

columnSchema.index({ projectId: 1, position: 1 });

module.exports = mongoose.model("Column", columnSchema);
