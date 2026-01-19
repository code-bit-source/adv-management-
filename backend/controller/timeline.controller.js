import Timeline from "../model/timeline.model.js";
import Case from "../model/case.model.js";

// ==================== ADD TIMELINE EVENT ====================
export const addEvent = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify case exists
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check access - only advocate, admin can add events
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can add timeline events"
      });
    }

    // Verify advocate is handling this case
    if (userRole === 'advocate' && caseDoc.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only add events to cases you are handling"
      });
    }

    // Create event
    const event = await Timeline.create({
      ...req.body,
      case: caseId,
      createdBy: userId
    });

    // Populate references
    await event.populate('createdBy', 'name email role');
    await event.populate('participants.user', 'name email role');

    return res.status(201).json({
      success: true,
      message: "Timeline event added successfully",
      event
    });

  } catch (error) {
    console.error("Add event error:", error);
    return res.status(500).json({
      success: false,
      message: "Error adding timeline event",
      error: error.message
    });
  }
};

// ==================== GET TIMELINE ====================
export const getTimeline = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify case exists and user has access
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check access
    const hasAccess = await caseDoc.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get filter options
    const { eventType, status, isMilestone, startDate, endDate } = req.query;

    // Build query
    const query = {
      case: caseId,
      isVisible: true
    };

    if (eventType) query.eventType = eventType;
    if (status) query.status = status;
    if (isMilestone === 'true') query.isMilestone = true;
    
    if (startDate || endDate) {
      query.eventDate = {};
      if (startDate) query.eventDate.$gte = new Date(startDate);
      if (endDate) query.eventDate.$lte = new Date(endDate);
    }

    // Get events
    const events = await Timeline.find(query)
      .sort({ eventDate: -1 })
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .populate('participants.user', 'name email role');

    // Separate into upcoming and past
    const now = new Date();
    const upcomingEvents = events.filter(e => e.eventDate >= now && e.status === 'scheduled');
    const pastEvents = events.filter(e => e.eventDate < now || e.status !== 'scheduled');

    return res.status(200).json({
      success: true,
      message: "Timeline retrieved successfully",
      timeline: {
        all: events,
        upcoming: upcomingEvents,
        past: pastEvents,
        total: events.length,
        upcomingCount: upcomingEvents.length,
        pastCount: pastEvents.length
      }
    });

  } catch (error) {
    console.error("Get timeline error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving timeline",
      error: error.message
    });
  }
};

// ==================== GET EVENT BY ID ====================
export const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get event
    const event = await Timeline.findById(eventId)
      .populate('case')
      .populate('createdBy', 'name email role')
      .populate('updatedBy', 'name email role')
      .populate('participants.user', 'name email role');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check access to case
    const hasAccess = await event.case.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this event"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Event retrieved successfully",
      event
    });

  } catch (error) {
    console.error("Get event error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving event",
      error: error.message
    });
  }
};

// ==================== UPDATE EVENT ====================
export const updateEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get event
    const event = await Timeline.findById(eventId).populate('case');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check permission - only advocate/admin can update
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can update events"
      });
    }

    // Verify advocate is handling this case
    if (userRole === 'advocate' && event.case.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only update events for cases you are handling"
      });
    }

    // Update event
    const allowedUpdates = [
      'title', 'description', 'eventDate', 'eventTime', 'location',
      'hearingDetails', 'priority', 'status', 'reminder', 'notes',
      'participants', 'isMilestone', 'milestoneType', 'metadata'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    event.updatedBy = userId;
    await event.save();

    // Populate references
    await event.populate('createdBy', 'name email role');
    await event.populate('updatedBy', 'name email role');
    await event.populate('participants.user', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event
    });

  } catch (error) {
    console.error("Update event error:", error);
    return res.status(500).json({
      success: false,
      message: "Error updating event",
      error: error.message
    });
  }
};

// ==================== DELETE EVENT ====================
export const deleteEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get event
    const event = await Timeline.findById(eventId).populate('case');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check permission - only advocate/admin can delete
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can delete events"
      });
    }

    // Verify advocate is handling this case
    if (userRole === 'advocate' && event.case.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete events for cases you are handling"
      });
    }

    // Soft delete - just hide it
    event.isVisible = false;
    event.updatedBy = userId;
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully"
    });

  } catch (error) {
    console.error("Delete event error:", error);
    return res.status(500).json({
      success: false,
      message: "Error deleting event",
      error: error.message
    });
  }
};

// ==================== ADD HEARING ====================
export const addHearing = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify case exists
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    // Check permission
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can add hearings"
      });
    }

    if (userRole === 'advocate' && caseDoc.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only add hearings to cases you are handling"
      });
    }

    // Create hearing event
    const hearing = await Timeline.create({
      case: caseId,
      eventType: 'hearing_scheduled',
      title: req.body.title || 'Court Hearing',
      description: req.body.description,
      eventDate: req.body.eventDate,
      eventTime: req.body.eventTime,
      location: req.body.location || {
        courtName: caseDoc.courtName,
        courtRoom: req.body.courtRoom
      },
      hearingDetails: {
        hearingType: req.body.hearingType || 'regular_hearing',
        judgeAssigned: req.body.judgeAssigned || caseDoc.judgeAssigned,
        expectedDuration: req.body.expectedDuration,
        isCompleted: false,
        isPostponed: false
      },
      priority: req.body.priority || 'high',
      reminder: {
        enabled: req.body.enableReminder !== false,
        notifyClient: req.body.notifyClient !== false,
        notifyParalegals: req.body.notifyParalegals !== false
      },
      participants: req.body.participants || [],
      notes: req.body.notes,
      createdBy: userId
    });

    // Update case's next hearing date
    caseDoc.nextHearingDate = req.body.eventDate;
    await caseDoc.save();

    // Populate references
    await hearing.populate('createdBy', 'name email role');
    await hearing.populate('participants.user', 'name email role');

    return res.status(201).json({
      success: true,
      message: "Hearing scheduled successfully",
      hearing
    });

  } catch (error) {
    console.error("Add hearing error:", error);
    return res.status(500).json({
      success: false,
      message: "Error scheduling hearing",
      error: error.message
    });
  }
};

// ==================== GET HEARINGS ====================
export const getHearings = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const { status } = req.query;

    // Verify case exists and user has access
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    const hasAccess = await caseDoc.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get hearings
    const hearings = await Timeline.getHearings(caseId, status);

    // Get next hearing
    const nextHearing = await Timeline.getNextHearing(caseId);

    return res.status(200).json({
      success: true,
      message: "Hearings retrieved successfully",
      hearings: {
        all: hearings,
        next: nextHearing,
        total: hearings.length
      }
    });

  } catch (error) {
    console.error("Get hearings error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving hearings",
      error: error.message
    });
  }
};

// ==================== MARK HEARING AS COMPLETED ====================
export const completeHearing = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { outcome, actualDuration, nextHearingDate, notes } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get event
    const event = await Timeline.findById(eventId).populate('case');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Hearing not found"
      });
    }

    // Check permission
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can mark hearings as completed"
      });
    }

    if (userRole === 'advocate' && event.case.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only complete hearings for cases you are handling"
      });
    }

    // Mark as completed
    await event.markAsCompleted(outcome);
    
    if (actualDuration) {
      event.hearingDetails.actualDuration = actualDuration;
    }
    
    if (nextHearingDate) {
      event.hearingDetails.nextHearingDate = nextHearingDate;
    }
    
    if (notes) {
      event.notes = notes;
    }

    event.updatedBy = userId;
    await event.save();

    await event.populate('createdBy', 'name email role');
    await event.populate('updatedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Hearing marked as completed",
      event
    });

  } catch (error) {
    console.error("Complete hearing error:", error);
    return res.status(500).json({
      success: false,
      message: "Error completing hearing",
      error: error.message
    });
  }
};

// ==================== POSTPONE HEARING ====================
export const postponeHearing = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { reason, newDate } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: "Postponement reason is required"
      });
    }

    // Get event
    const event = await Timeline.findById(eventId).populate('case');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Hearing not found"
      });
    }

    // Check permission
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can postpone hearings"
      });
    }

    if (userRole === 'advocate' && event.case.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only postpone hearings for cases you are handling"
      });
    }

    // Mark as postponed
    await event.markAsPostponed(reason, newDate);
    event.updatedBy = userId;
    await event.save();

    await event.populate('createdBy', 'name email role');
    await event.populate('updatedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Hearing postponed successfully",
      event
    });

  } catch (error) {
    console.error("Postpone hearing error:", error);
    return res.status(500).json({
      success: false,
      message: "Error postponing hearing",
      error: error.message
    });
  }
};

// ==================== GET MILESTONES ====================
export const getMilestones = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Verify case exists and user has access
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    const hasAccess = await caseDoc.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get milestones
    const milestones = await Timeline.getMilestones(caseId);

    return res.status(200).json({
      success: true,
      message: "Milestones retrieved successfully",
      milestones,
      total: milestones.length
    });

  } catch (error) {
    console.error("Get milestones error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving milestones",
      error: error.message
    });
  }
};

// ==================== MARK AS MILESTONE ====================
export const markAsMilestone = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { milestoneType } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get event
    const event = await Timeline.findById(eventId).populate('case');
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found"
      });
    }

    // Check permission
    if (userRole !== 'advocate' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Only advocates and admins can mark events as milestones"
      });
    }

    if (userRole === 'advocate' && event.case.advocate.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only mark milestones for cases you are handling"
      });
    }

    // Mark as milestone
    event.isMilestone = true;
    if (milestoneType) {
      event.milestoneType = milestoneType;
    }
    event.updatedBy = userId;
    await event.save();

    await event.populate('createdBy', 'name email role');
    await event.populate('updatedBy', 'name email role');

    return res.status(200).json({
      success: true,
      message: "Event marked as milestone",
      event
    });

  } catch (error) {
    console.error("Mark milestone error:", error);
    return res.status(500).json({
      success: false,
      message: "Error marking event as milestone",
      error: error.message
    });
  }
};

// ==================== GET UPCOMING EVENTS ====================
export const getUpcomingEvents = async (req, res) => {
  try {
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    const limit = parseInt(req.query.limit) || 10;

    // Verify case exists and user has access
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: "Case not found"
      });
    }

    const hasAccess = await caseDoc.hasAccess(userId, userRole);
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this case"
      });
    }

    // Get upcoming events
    const events = await Timeline.getUpcomingEvents(caseId, limit);

    return res.status(200).json({
      success: true,
      message: "Upcoming events retrieved successfully",
      events,
      total: events.length
    });

  } catch (error) {
    console.error("Get upcoming events error:", error);
    return res.status(500).json({
      success: false,
      message: "Error retrieving upcoming events",
      error: error.message
    });
  }
};
