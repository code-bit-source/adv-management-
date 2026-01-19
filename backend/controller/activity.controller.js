import Activity from "../model/activity.model.js";
import Case from "../model/case.model.js";

// ==================== GET CASE ACTIVITIES ====================
export const getCaseActivities = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      page = 1,
      limit = 50,
      type,
      importance,
      startDate,
      endDate,
      activityUserId
    } = req.query;

    // Check if case exists
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check case access
    if (!caseData.hasAccess(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get activities
    const result = await Activity.getCaseTimeline(caseId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      importance,
      startDate,
      endDate,
      userId: activityUserId
    });

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get case activities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get case activities",
      error: error.message
    });
  }
};

// ==================== GET CASE TIMELINE ====================
export const getCaseTimeline = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if case exists
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check case access
    if (!caseData.hasAccess(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get all activities for timeline (no pagination)
    const activities = await Activity.find({ 
      case: caseId, 
      isVisible: true 
    })
      .populate('user', 'name email role profilePicture')
      .sort({ createdAt: -1 });

    // Group activities by date
    const timeline = {};
    activities.forEach(activity => {
      const date = activity.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      if (!timeline[date]) {
        timeline[date] = [];
      }
      
      timeline[date].push({
        id: activity._id,
        type: activity.type,
        description: activity.description,
        action: activity.action,
        user: activity.user,
        importance: activity.importance,
        time: activity.createdAt.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        timestamp: activity.createdAt,
        relatedEntity: activity.relatedEntity,
        changes: activity.changes,
        metadata: activity.metadata
      });
    });

    return res.status(200).json({
      success: true,
      timeline,
      totalActivities: activities.length
    });

  } catch (error) {
    console.error("Get case timeline error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get case timeline",
      error: error.message
    });
  }
};

// ==================== GET ACTIVITY STATISTICS ====================
export const getActivityStats = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if case exists
    const caseData = await Case.findById(caseId);
    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check case access
    if (!caseData.hasAccess(userId, userRole)) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get statistics
    const stats = await Activity.getActivityStats(caseId);

    return res.status(200).json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("Get activity stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get activity statistics",
      error: error.message
    });
  }
};

// ==================== GET USER ACTIVITY ====================
export const getUserActivity = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      page = 1,
      limit = 20,
      caseId,
      type,
      startDate,
      endDate
    } = req.query;

    // Get user's activities
    const result = await Activity.getUserActivity(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      caseId,
      type,
      startDate,
      endDate
    });

    return res.status(200).json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("Get user activity error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get user activity",
      error: error.message
    });
  }
};

// ==================== GET ACTIVITY BY ID ====================
export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const activity = await Activity.findById(id)
      .populate('user', 'name email role profilePicture')
      .populate('case', 'title caseNumber');

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    // Check if user can view this activity
    const canView = activity.canView(userId, userRole);
    
    if (canView === 'check_case_access') {
      const caseData = await Case.findById(activity.case);
      if (!caseData || !caseData.hasAccess(userId, userRole)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this activity"
        });
      }
    } else if (canView === false) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this activity"
      });
    }

    return res.status(200).json({
      success: true,
      activity
    });

  } catch (error) {
    console.error("Get activity by ID error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get activity",
      error: error.message
    });
  }
};

// ==================== LOG ACTIVITY (HELPER FUNCTION) ====================
export const logActivity = async (data) => {
  try {
    await Activity.logActivity(data);
  } catch (error) {
    console.error("Error logging activity:", error);
    // Don't throw error - logging should not break the main operation
  }
};

// ==================== GET RECENT ACTIVITIES ====================
export const getRecentActivities = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { limit = 10 } = req.query;

    let query = { isVisible: true };

    // If not admin, filter by user's cases
    if (userRole !== 'admin') {
      const userCases = await Case.find({
        $or: [
          { client: userId },
          { advocate: userId },
          { paralegals: userId }
        ]
      }).select('_id');

      const caseIds = userCases.map(c => c._id);
      query.case = { $in: caseIds };
    }

    const activities = await Activity.find(query)
      .populate('user', 'name email role')
      .populate('case', 'title caseNumber')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return res.status(200).json({
      success: true,
      count: activities.length,
      activities
    });

  } catch (error) {
    console.error("Get recent activities error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get recent activities",
      error: error.message
    });
  }
};

// ==================== GET ACTIVITIES BY TYPE ====================
export const getActivitiesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const {
      page = 1,
      limit = 20,
      caseId
    } = req.query;

    let query = { type, isVisible: true };

    // Filter by case if provided
    if (caseId) {
      const caseData = await Case.findById(caseId);
      if (!caseData) {
        return res.status(404).json({
          success: false,
          message: "Case not found"
        });
      }

      if (!caseData.hasAccess(userId, userRole)) {
        return res.status(403).json({
          success: false,
          message: "You don't have access to this case"
        });
      }

      query.case = caseId;
    } else if (userRole !== 'admin') {
      // Filter by user's cases
      const userCases = await Case.find({
        $or: [
          { client: userId },
          { advocate: userId },
          { paralegals: userId }
        ]
      }).select('_id');

      const caseIds = userCases.map(c => c._id);
      query.case = { $in: caseIds };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const activities = await Activity.find(query)
      .populate('user', 'name email role')
      .populate('case', 'title caseNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Activity.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: activities.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      activities
    });

  } catch (error) {
    console.error("Get activities by type error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get activities",
      error: error.message
    });
  }
};

// ==================== DELETE ACTIVITY (ADMIN ONLY) ====================
export const deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Only admin can delete activities
    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete activities"
      });
    }

    const activity = await Activity.findByIdAndDelete(id);

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Activity not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Activity deleted successfully"
    });

  } catch (error) {
    console.error("Delete activity error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete activity",
      error: error.message
    });
  }
};
