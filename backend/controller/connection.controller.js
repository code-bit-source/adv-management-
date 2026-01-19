import Connection from "../model/connection.model.js";
import User from "../model/user.model.js";

// ==================== SEARCH ADVOCATES ====================
export const searchAdvocates = async (req, res) => {
  try {
    const {
      search,
      specialization,
      city,
      state,
      minExperience,
      maxExperience,
      minRating,
      availability,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = { role: "advocate" };

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Filter by specialization
    if (specialization) {
      query.specialization = { $in: [specialization] };
    }

    // Filter by location
    if (city) {
      query["location.city"] = { $regex: city, $options: "i" };
    }
    if (state) {
      query["location.state"] = { $regex: state, $options: "i" };
    }

    // Filter by experience
    if (minExperience) {
      query.experience = { ...query.experience, $gte: parseInt(minExperience) };
    }
    if (maxExperience) {
      query.experience = { ...query.experience, $lte: parseInt(maxExperience) };
    }

    // Filter by rating
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Filter by availability
    if (availability !== undefined) {
      query.availability = availability === "true";
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const advocates = await User.find(query)
      .select("-password -googleId")
      .sort({ rating: -1, totalCases: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: advocates.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      advocates,
    });
  } catch (error) {
    console.error("Search advocates error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search advocates",
      error: error.message,
    });
  }
};

// ==================== SEARCH PARALEGALS ====================
export const searchParalegals = async (req, res) => {
  try {
    const {
      search,
      city,
      state,
      minExperience,
      maxExperience,
      minRating,
      availability,
      page = 1,
      limit = 10,
    } = req.query;

    // Build query
    const query = { role: "paralegal" };

    // Search by name
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // Filter by location
    if (city) {
      query["location.city"] = { $regex: city, $options: "i" };
    }
    if (state) {
      query["location.state"] = { $regex: state, $options: "i" };
    }

    // Filter by experience
    if (minExperience) {
      query.experience = { ...query.experience, $gte: parseInt(minExperience) };
    }
    if (maxExperience) {
      query.experience = { ...query.experience, $lte: parseInt(maxExperience) };
    }

    // Filter by rating
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating) };
    }

    // Filter by availability
    if (availability !== undefined) {
      query.availability = availability === "true";
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const paralegals = await User.find(query)
      .select("-password -googleId")
      .sort({ rating: -1, totalCases: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await User.countDocuments(query);

    return res.status(200).json({
      success: true,
      count: paralegals.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      paralegals,
    });
  } catch (error) {
    console.error("Search paralegals error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to search paralegals",
      error: error.message,
    });
  }
};

// ==================== SEND CONNECTION REQUEST ====================
export const sendConnectionRequest = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { recipientId, connectionType, requestMessage } = req.body;

    // Validate input
    if (!recipientId || !connectionType) {
      return res.status(400).json({
        success: false,
        message: "Recipient ID and connection type are required",
      });
    }

    // Validate connection type
    if (!["advocate", "paralegal"].includes(connectionType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid connection type. Must be 'advocate' or 'paralegal'",
      });
    }

    // Check if requester is a client
    if (req.user.role !== "client") {
      return res.status(403).json({
        success: false,
        message: "Only clients can send connection requests",
      });
    }

    // Check if trying to connect to self
    if (requesterId === recipientId) {
      return res.status(400).json({
        success: false,
        message: "Cannot send connection request to yourself",
      });
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "Recipient not found",
      });
    }

    // Verify recipient role matches connection type
    if (recipient.role !== connectionType) {
      return res.status(400).json({
        success: false,
        message: `Recipient is not a ${connectionType}`,
      });
    }

    // Check if connection already exists
    const existingConnection = await Connection.connectionExists(requesterId, recipientId);
    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: "Connection request already exists with this user",
      });
    }

    // Create connection request
    const connection = await Connection.create({
      requester: requesterId,
      recipient: recipientId,
      connectionType,
      requestMessage: requestMessage || null,
    });

    // Populate user details
    await connection.populate("requester", "name email role profilePicture");
    await connection.populate("recipient", "name email role profilePicture");

    return res.status(201).json({
      success: true,
      message: "Connection request sent successfully",
      connection,
    });
  } catch (error) {
    console.error("Send connection request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send connection request",
      error: error.message,
    });
  }
};

// ==================== GET RECEIVED CONNECTION REQUESTS ====================
export const getReceivedRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status = "pending" } = req.query;

    // Only advocates and paralegals can receive requests
    if (!["advocate", "paralegal"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only advocates and paralegals can view received requests",
      });
    }

    // Build query
    const query = { recipient: userId };
    if (status) {
      query.status = status;
    }

    // Get requests
    const requests = await Connection.find(query)
      .populate("requester", "name email role profilePicture phone location")
      .populate("recipient", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get received requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get received requests",
      error: error.message,
    });
  }
};

// ==================== GET SENT CONNECTION REQUESTS ====================
export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    // Build query
    const query = { requester: userId };
    if (status) {
      query.status = status;
    }

    // Get requests
    const requests = await Connection.find(query)
      .populate("requester", "name email role")
      .populate("recipient", "name email role profilePicture specialization experience location rating")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("Get sent requests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get sent requests",
      error: error.message,
    });
  }
};

// ==================== ACCEPT CONNECTION REQUEST ====================
export const acceptConnectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { responseMessage } = req.body;

    // Find connection
    const connection = await Connection.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    // Check if user is the recipient
    if (connection.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only accept requests sent to you",
      });
    }

    // Check if already responded
    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request already ${connection.status}`,
      });
    }

    // Accept connection
    await connection.accept(responseMessage);
    await connection.populate("requester", "name email role profilePicture");
    await connection.populate("recipient", "name email role profilePicture");

    return res.status(200).json({
      success: true,
      message: "Connection request accepted successfully",
      connection,
    });
  } catch (error) {
    console.error("Accept connection request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept connection request",
      error: error.message,
    });
  }
};

// ==================== REJECT CONNECTION REQUEST ====================
export const rejectConnectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { responseMessage } = req.body;

    // Find connection
    const connection = await Connection.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection request not found",
      });
    }

    // Check if user is the recipient
    if (connection.recipient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only reject requests sent to you",
      });
    }

    // Check if already responded
    if (connection.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request already ${connection.status}`,
      });
    }

    // Reject connection
    await connection.reject(responseMessage);
    await connection.populate("requester", "name email role profilePicture");
    await connection.populate("recipient", "name email role profilePicture");

    return res.status(200).json({
      success: true,
      message: "Connection request rejected",
      connection,
    });
  } catch (error) {
    console.error("Reject connection request error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject connection request",
      error: error.message,
    });
  }
};

// ==================== GET MY CONNECTIONS ====================
export const getMyConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionType } = req.query;

    // Build query for accepted connections
    const query = {
      $or: [
        { requester: userId, status: "accepted", isActive: true },
        { recipient: userId, status: "accepted", isActive: true },
      ],
    };

    // Filter by connection type if provided
    if (connectionType) {
      query.connectionType = connectionType;
    }

    // Get connections
    const connections = await Connection.find(query)
      .populate("requester", "name email role profilePicture specialization experience location rating phone")
      .populate("recipient", "name email role profilePicture specialization experience location rating phone")
      .sort({ respondedAt: -1 });

    // Format connections to show the "other" user
    const formattedConnections = connections.map((conn) => {
      const isRequester = conn.requester._id.toString() === userId;
      const connectedUser = isRequester ? conn.recipient : conn.requester;

      return {
        connectionId: conn._id,
        connectedUser,
        connectionType: conn.connectionType,
        connectedAt: conn.respondedAt,
        connectionDuration: conn.connectionDuration,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedConnections.length,
      connections: formattedConnections,
    });
  } catch (error) {
    console.error("Get my connections error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get connections",
      error: error.message,
    });
  }
};

// ==================== GET CONNECTION DETAILS ====================
export const getConnectionDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find connection
    const connection = await Connection.findById(id)
      .populate("requester", "name email role profilePicture specialization experience location rating phone bio")
      .populate("recipient", "name email role profilePicture specialization experience location rating phone bio");

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    // Check if user is part of this connection
    const isRequester = connection.requester._id.toString() === userId;
    const isRecipient = connection.recipient._id.toString() === userId;

    if (!isRequester && !isRecipient && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only view your own connections",
      });
    }

    return res.status(200).json({
      success: true,
      connection,
    });
  } catch (error) {
    console.error("Get connection details error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get connection details",
      error: error.message,
    });
  }
};

// ==================== REMOVE CONNECTION ====================
export const removeConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find connection
    const connection = await Connection.findById(id);

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: "Connection not found",
      });
    }

    // Check if connection is already blocked/removed
    if (connection.status === "blocked" || !connection.isActive) {
      return res.status(404).json({
        success: false,
        message: "Connection not found or already removed",
      });
    }

    // Check if user is part of this connection
    const isRequester = connection.requester.toString() === userId;
    const isRecipient = connection.recipient.toString() === userId;

    if (!isRequester && !isRecipient) {
      return res.status(403).json({
        success: false,
        message: "You can only remove your own connections",
      });
    }

    // Block/deactivate connection
    await connection.block();

    return res.status(200).json({
      success: true,
      message: "Connection removed successfully",
    });
  } catch (error) {
    console.error("Remove connection error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to remove connection",
      error: error.message,
    });
  }
};

// ==================== GET CONNECTION STATISTICS ====================
export const getConnectionStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get statistics
    const stats = {
      totalConnections: 0,
      advocates: 0,
      paralegals: 0,
      pendingRequests: 0,
      acceptedConnections: 0,
      rejectedRequests: 0,
    };

    // Count connections based on role
    if (req.user.role === "client") {
      // For clients: count sent requests
      stats.totalConnections = await Connection.countDocuments({ requester: userId });
      stats.advocates = await Connection.countDocuments({
        requester: userId,
        connectionType: "advocate",
        status: "accepted",
      });
      stats.paralegals = await Connection.countDocuments({
        requester: userId,
        connectionType: "paralegal",
        status: "accepted",
      });
      stats.pendingRequests = await Connection.countDocuments({
        requester: userId,
        status: "pending",
      });
      stats.acceptedConnections = await Connection.countDocuments({
        requester: userId,
        status: "accepted",
      });
      stats.rejectedRequests = await Connection.countDocuments({
        requester: userId,
        status: "rejected",
      });
    } else {
      // For advocates/paralegals: count received requests
      stats.totalConnections = await Connection.countDocuments({ recipient: userId });
      stats.pendingRequests = await Connection.countDocuments({
        recipient: userId,
        status: "pending",
      });
      stats.acceptedConnections = await Connection.countDocuments({
        recipient: userId,
        status: "accepted",
      });
      stats.rejectedRequests = await Connection.countDocuments({
        recipient: userId,
        status: "rejected",
      });
    }

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get connection stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get connection statistics",
      error: error.message,
    });
  }
};
