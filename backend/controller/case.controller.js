import Case from "../model/case.model.js";
import Note from "../model/note.model.js";
import User from "../model/user.model.js";
import Connection from "../model/connection.model.js";

// ==================== CREATE CASE ====================
export const createCase = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const {
      title,
      description,
      category,
      subCategory,
      clientId,
      advocateId,
      paralegalIds,
      courtName,
      courtLocation,
      judgeAssigned,
      filingDate,
      nextHearingDate,
      opposingParty,
      caseValue,
      priority,
      tags,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, description, and category are required",
      });
    }

    // Determine client and advocate based on user role
    let finalClientId = clientId;
    let finalAdvocateId = advocateId;

    if (userRole === "client") {
      finalClientId = userId;
      
      if (!advocateId) {
        return res.status(400).json({
          success: false,
          message: "Advocate ID is required when client creates a case",
        });
      }
      
      // Verify connection exists
      const connection = await Connection.findOne({
        requester: userId,
        recipient: advocateId,
        connectionType: "advocate",
        status: "accepted",
        isActive: true,
      });
      
      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You must be connected with the advocate to create a case",
        });
      }
      
      finalAdvocateId = advocateId;
    } else if (userRole === "advocate") {
      finalAdvocateId = userId;
      
      if (!clientId) {
        return res.status(400).json({
          success: false,
          message: "Client ID is required when advocate creates a case",
        });
      }
      
      // Verify connection exists
      const connection = await Connection.findOne({
        requester: clientId,
        recipient: userId,
        connectionType: "advocate",
        status: "accepted",
        isActive: true,
      });
      
      if (!connection) {
        return res.status(403).json({
          success: false,
          message: "You must be connected with the client to create a case",
        });
      }
      
      finalClientId = clientId;
    } else if (userRole === "admin") {
      if (!clientId || !advocateId) {
        return res.status(400).json({
          success: false,
          message: "Both client ID and advocate ID are required",
        });
      }
      finalClientId = clientId;
      finalAdvocateId = advocateId;
    } else {
      return res.status(403).json({
        success: false,
        message: "Only clients, advocates, and admins can create cases",
      });
    }

    // Verify client and advocate exist
    const client = await User.findById(finalClientId);
    const advocate = await User.findById(finalAdvocateId);

    if (!client || client.role !== "client") {
      return res.status(404).json({
        success: false,
        message: "Valid client not found",
      });
    }

    if (!advocate || advocate.role !== "advocate") {
      return res.status(404).json({
        success: false,
        message: "Valid advocate not found",
      });
    }

    // Verify paralegals if provided
    let validParalegalIds = [];
    if (paralegalIds && paralegalIds.length > 0) {
      const paralegals = await User.find({
        _id: { $in: paralegalIds },
        role: "paralegal",
      });
      
      if (paralegals.length !== paralegalIds.length) {
        return res.status(400).json({
          success: false,
          message: "One or more invalid paralegal IDs",
        });
      }
      
      validParalegalIds = paralegalIds;
    }

    // Create case
    const newCase = await Case.create({
      title,
      description,
      category,
      subCategory,
      client: finalClientId,
      advocate: finalAdvocateId,
      paralegals: validParalegalIds,
      courtName,
      courtLocation,
      judgeAssigned,
      filingDate,
      nextHearingDate,
      opposingParty,
      caseValue,
      priority: priority || "medium",
      tags: tags || [],
      createdBy: userId,
      status: "active",
    });

    // Populate user details
    await newCase.populate("client", "name email role phone");
    await newCase.populate("advocate", "name email role phone specialization");
    await newCase.populate("paralegals", "name email role phone");

    return res.status(201).json({
      success: true,
      message: "Case created successfully",
      case: newCase,
    });
  } catch (error) {
    console.error("Create case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create case",
      error: error.message,
    });
  }
};

// ==================== GET ALL CASES ====================
export const getCases = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status, category, priority, search, page = 1, limit = 10 } = req.query;

    // Build query based on role
    let query = {};
    
    if (userRole === "client") {
      query.client = userId;
    } else if (userRole === "advocate") {
      query.advocate = userId;
    } else if (userRole === "paralegal") {
      query.paralegals = userId;
    }
    // Admin can see all cases (no filter)

    // Apply filters
    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { caseNumber: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const cases = await Case.find(query)
      .populate("client", "name email phone")
      .populate("advocate", "name email phone specialization")
      .populate("paralegals", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Case.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: cases.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      cases,
    });
  } catch (error) {
    console.error("Get cases error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get cases",
      error: error.message,
    });
  }
};

// ==================== GET CASE BY ID ====================
export const getCaseById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseData = await Case.findById(id)
      .populate("client", "name email phone location")
      .populate("advocate", "name email phone specialization experience")
      .populate("paralegals", "name email phone")
      .populate("createdBy", "name email role");

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Check access
    if (!caseData.hasAccess(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case",
      });
    }

    return res.status(200).json({
      success: true,
      case: caseData,
    });
  } catch (error) {
    console.error("Get case by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get case",
      error: error.message,
    });
  }
};

// ==================== UPDATE CASE ====================
export const updateCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseData = await Case.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Check edit permission
    if (!caseData.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned advocate or admin can edit this case",
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      "title",
      "description",
      "category",
      "subCategory",
      "status",
      "priority",
      "courtName",
      "courtLocation",
      "judgeAssigned",
      "filingDate",
      "nextHearingDate",
      "opposingParty",
      "caseValue",
      "tags",
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        caseData[field] = req.body[field];
      }
    });

    await caseData.save();
    await caseData.populate("client", "name email phone");
    await caseData.populate("advocate", "name email phone specialization");
    await caseData.populate("paralegals", "name email phone");

    return res.status(200).json({
      success: true,
      message: "Case updated successfully",
      case: caseData,
    });
  } catch (error) {
    console.error("Update case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update case",
      error: error.message,
    });
  }
};

// ==================== ASSIGN PARALEGAL ====================
export const assignParalegal = async (req, res) => {
  try {
    const { id } = req.params;
    const { paralegalId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!paralegalId) {
      return res.status(400).json({
        success: false,
        message: "Paralegal ID is required",
      });
    }

    const caseData = await Case.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Check edit permission
    if (!caseData.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned advocate or admin can assign paralegals",
      });
    }

    // Verify paralegal exists
    const paralegal = await User.findById(paralegalId);
    if (!paralegal || paralegal.role !== "paralegal") {
      return res.status(404).json({
        success: false,
        message: "Valid paralegal not found",
      });
    }

    // Check if already assigned
    if (caseData.paralegals.includes(paralegalId)) {
      return res.status(400).json({
        success: false,
        message: "Paralegal is already assigned to this case",
      });
    }

    // Add paralegal
    caseData.paralegals.push(paralegalId);
    await caseData.save();
    await caseData.populate("paralegals", "name email phone");

    return res.status(200).json({
      success: true,
      message: "Paralegal assigned successfully",
      case: caseData,
    });
  } catch (error) {
    console.error("Assign paralegal error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to assign paralegal",
      error: error.message,
    });
  }
};

// ==================== REMOVE PARALEGAL ====================
export const removeParalegal = async (req, res) => {
  try {
    const { id, paralegalId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseData = await Case.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Check edit permission
    if (!caseData.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned advocate or admin can remove paralegals",
      });
    }

    // Remove paralegal
    caseData.paralegals = caseData.paralegals.filter(
      (p) => p.toString() !== paralegalId
    );
    
    await caseData.save();
    await caseData.populate("paralegals", "name email phone");

    return res.status(200).json({
      success: true,
      message: "Paralegal removed successfully",
      case: caseData,
    });
  } catch (error) {
    console.error("Remove paralegal error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove paralegal",
      error: error.message,
    });
  }
};

// ==================== CLOSE CASE ====================
export const closeCase = async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!outcome || !["won", "lost", "closed"].includes(outcome)) {
      return res.status(400).json({
        success: false,
        message: "Valid outcome is required (won, lost, or closed)",
      });
    }

    const caseData = await Case.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Check edit permission
    if (!caseData.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned advocate or admin can close this case",
      });
    }

    await caseData.closeCase(outcome);
    await caseData.populate("client", "name email phone");
    await caseData.populate("advocate", "name email phone specialization");

    return res.status(200).json({
      success: true,
      message: `Case closed with outcome: ${outcome}`,
      case: caseData,
    });
  } catch (error) {
    console.error("Close case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close case",
      error: error.message,
    });
  }
};

// ==================== ARCHIVE CASE ====================
export const archiveCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseData = await Case.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Check edit permission
    if (!caseData.canEdit(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only the assigned advocate or admin can archive this case",
      });
    }

    await caseData.archive();

    return res.status(200).json({
      success: true,
      message: "Case archived successfully",
      case: caseData,
    });
  } catch (error) {
    console.error("Archive case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to archive case",
      error: error.message,
    });
  }
};

// ==================== DELETE CASE ====================
export const deleteCase = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseData = await Case.findById(id);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    // Only admin can delete cases
    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete cases",
      });
    }

    await Case.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Case deleted successfully",
    });
  } catch (error) {
    console.error("Delete case error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete case",
      error: error.message,
    });
  }
};

// ==================== GET CASE STATISTICS ====================
export const getCaseStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = {};
    
    if (userRole === "client") {
      query.client = userId;
    } else if (userRole === "advocate") {
      query.advocate = userId;
    } else if (userRole === "paralegal") {
      query.paralegals = userId;
    }

    const stats = {
      total: await Case.countDocuments(query),
      active: await Case.countDocuments({ ...query, status: "active" }),
      pending: await Case.countDocuments({ ...query, status: "pending" }),
      closed: await Case.countDocuments({ ...query, status: "closed" }),
      won: await Case.countDocuments({ ...query, status: "won" }),
      lost: await Case.countDocuments({ ...query, status: "lost" }),
      onHold: await Case.countDocuments({ ...query, status: "on_hold" }),
      draft: await Case.countDocuments({ ...query, status: "draft" }),
    };

    // Priority breakdown
    stats.byPriority = {
      urgent: await Case.countDocuments({ ...query, priority: "urgent" }),
      high: await Case.countDocuments({ ...query, priority: "high" }),
      medium: await Case.countDocuments({ ...query, priority: "medium" }),
      low: await Case.countDocuments({ ...query, priority: "low" }),
    };

    // Category breakdown
    const categories = await Case.aggregate([
      { $match: query },
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]);
    
    stats.byCategory = categories.reduce((acc, cat) => {
      acc[cat._id] = cat.count;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get case stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get case statistics",
      error: error.message,
    });
  }
};
