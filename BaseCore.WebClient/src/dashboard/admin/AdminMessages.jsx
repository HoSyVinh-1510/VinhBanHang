import React, { useEffect, useState, useCallback, useRef } from "react";
import { messageApi } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";

  // Format beautifully: HH:MM - DD/MM/YYYY
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${hours}:${minutes} - ${day}/${month}/${year}`;
};

const AdminMessages = () => {
  const { user } = useAuth();

  const [allMessages, setAllMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Active User session state
  const [selectedUser, setSelectedUser] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const chatEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to bottom of the chat list container (without scrolling the main browser window)
  const scrollToBottom = useCallback((behavior = "smooth") => {
    setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTo({
          top: chatBodyRef.current.scrollHeight,
          behavior,
        });
      }
    }, 100);
  }, []);

  // Helper to identify current admin details
  const getAdminIdentity = useCallback(() => {
    if (!user) return { id: "admin_all", name: "Ban quản trị HSV" };
    const username = (user.username || "").toLowerCase();
    const name = (user.name || "").toLowerCase();

    if (username.includes("vinh") || name.includes("vinh")) {
      return { id: "admin_vinh", name: "Admin Vinh (Hồ Sỹ Vinh)" };
    }
    if (username.includes("tuan") || name.includes("tuan")) {
      return { id: "admin_tuan", name: "Admin Tuấn (Kỹ thuật)" };
    }
    return { id: "admin_all", name: "Ban quản trị HSV" };
  }, [user]);

  const currentAdmin = getAdminIdentity();

  // Helper to extract admin info from message subject dynamically
  const getAdminNameAndInitial = useCallback((msg) => {
    const subjectLower = (msg.subject || "").toLowerCase();
    if (subjectLower.includes("tuan") || subjectLower.includes("tuấn")) {
      return {
        name: "Admin Tuấn",
        initial: "T",
        bgClass: "bg-success text-white",
      };
    }
    if (subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh")) {
      return {
        name: "Admin Vinh",
        initial: "V",
        bgClass: "bg-primary text-white",
      };
    }
    return {
      name: "Ban quản trị HSV",
      initial: "H",
      bgClass: "bg-warning text-dark",
    };
  }, []);

  // Filter messages for current admin strictly based on their identity
  const getAdminMessages = useCallback(() => {
    return allMessages.filter((m) => {
      const subjectLower = (m.subject || "").toLowerCase();
      if (currentAdmin.id === "admin_vinh") {
        return (
          subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh")
        );
      }
      if (currentAdmin.id === "admin_tuan") {
        return subjectLower.includes("tuan") || subjectLower.includes("tuấn");
      }
      if (currentAdmin.id === "admin_all") {
        return (
          subjectLower.includes("ban quản trị") ||
          subjectLower.includes("hsv") ||
          (!subjectLower.includes("vinh") && !subjectLower.includes("tuan"))
        );
      }
      return false;
    });
  }, [allMessages, currentAdmin]);

  const adminMessages = getAdminMessages();

  const loadMessages = useCallback(
    async (isInitial = false) => {
      setLoading(true);
      setError("");
      try {
        // Load large page size to fetch all active threads for the Admin sidebar
        const response = await messageApi.getAll(1, 100);
        const rawMessages = response.data?.items || [];

        // Sort chronologically (oldest first)
        const sorted = rawMessages
          .slice()
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        setAllMessages(sorted);

        // Auto-select the first user thread if none is selected
        // We calculate the filtered admin messages first
        const adminIdObj = getAdminIdentity();
        const filtered = sorted.filter((m) => {
          const subjectLower = (m.subject || "").toLowerCase();
          if (adminIdObj.id === "admin_vinh") {
            return (
              subjectLower.includes("vinh") ||
              subjectLower.includes("hồ sỹ vinh")
            );
          }
          if (adminIdObj.id === "admin_tuan") {
            return (
              subjectLower.includes("tuan") || subjectLower.includes("tuấn")
            );
          }
          if (adminIdObj.id === "admin_all") {
            return (
              subjectLower.includes("ban quản trị") ||
              subjectLower.includes("hsv") ||
              (!subjectLower.includes("vinh") && !subjectLower.includes("tuan"))
            );
          }
          return false;
        });

        if (filtered.length > 0 && !selectedUser) {
          // Group by unique user id
          const uniqueUserIds = Array.from(
            new Set(filtered.map((m) => m.userId || m.fullName)),
          );
          if (uniqueUserIds.length > 0) {
            const firstUserId = uniqueUserIds[0];
            const firstUserMsg = filtered.find(
              (m) => (m.userId || m.fullName) === firstUserId,
            );
            setSelectedUser({
              userId: firstUserMsg.userId || firstUserMsg.fullName,
              fullName: firstUserMsg.fullName,
              email: firstUserMsg.email,
            });
          }
        }

        if (isInitial || sorted.length > 0) {
          scrollToBottom(isInitial ? "auto" : "smooth");
        }
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Không thể tải danh sách tin nhắn hỗ trợ.",
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedUser, scrollToBottom, getAdminIdentity],
  );

  useEffect(() => {
    loadMessages(true);
  }, [loadMessages]);

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "vi-VN"; // Vietnamese language support

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setReplyInput((current) => {
            const cleanCurrent = current.trim();
            return cleanCurrent ? `${cleanCurrent} ${transcript}` : transcript;
          });
        }
      };

      rec.onerror = (err) => {
        console.error("Speech recognition error", err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError(
        "Trình duyệt không hỗ trợ tính năng nhận diện giọng nói (Speech to Text).",
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setError("");
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error("Không thể khởi động ghi âm:", err);
      }
    }
  };

  // Group unique conversations for the left sidebar (filtered for current admin)
  const getConversations = () => {
    const uniqueThreads = {};

    // Process messages in chronological order so the last message is kept as preview
    adminMessages.forEach((msg) => {
      const key = msg.userId || msg.fullName;
      uniqueThreads[key] = {
        userId: msg.userId || msg.fullName,
        fullName: msg.fullName,
        email: msg.email,
        lastMessage: msg.message,
        lastTime: msg.createdAt,
        status: msg.status,
      };
    });

    // Filter by query search
    let list = Object.values(uniqueThreads);
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      list = list.filter((u) => u.fullName.toLowerCase().includes(q));
    }

    // Sort active threads by last message time (newest first)
    return list.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
  };

  const handleSendReply = async (event) => {
    event.preventDefault();
    if (!replyInput.trim() || !selectedUser) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    // Find the latest message sent by this specific selectedUser that needs to be replied to
    const userMessages = adminMessages.filter(
      (m) => (m.userId || m.fullName) === selectedUser.userId,
    );

    if (userMessages.length === 0) {
      setError("Không tìm thấy tin nhắn nào của người dùng để trả lời.");
      setSubmitting(false);
      return;
    }

    // Find the latest message
    const latestMessage = userMessages[userMessages.length - 1];

    try {
      await messageApi.reply(latestMessage.id, replyInput.trim());
      setReplyInput("");
      setSuccess("Đã gửi phản hồi thành công!");
      await loadMessages(false);
      scrollToBottom("smooth");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Không thể gửi phản hồi.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter messages for the active conversation (filtered for current admin)
  const getActiveChatHistory = () => {
    if (!selectedUser) return [];
    return adminMessages.filter(
      (m) => (m.userId || m.fullName) === selectedUser.userId,
    );
  };

  const getFirstLetter = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  const activeHistory = getActiveChatHistory();
  const conversationList = getConversations();

  return (
    <div
      className="content-wrapper admin-dashboard-page"
      style={{ background: "#f8fafc" }}
    >
      {/* Content Header */}
      <section className="content-header bg-white border-bottom shadow-xs py-3 px-4">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-sm-6">
              <h1
                className="m-0 font-weight-bold text-dark"
                style={{ fontSize: "20px" }}
              >
                <i className="fas fa-comments text-primary mr-2"></i> HSV Admin
                Chat Support
              </h1>
            </div>
            <div className="col-sm-6">
              <ol className="breadcrumb float-sm-right small bg-transparent p-0 m-0">
                <li className="breadcrumb-item">Trang chủ</li>
                <li className="breadcrumb-item active">Hộp thư hỗ trợ</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="content py-4 px-4">
        <div className="container-fluid">
          <div className="row">
            <div className="col-lg-4 mb-4">
              <div
                className="bg-white border rounded shadow-sm overflow-hidden"
                style={{
                  height: 620,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div className="p-3 border-bottom bg-light">
                  {/* Search Bar */}
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control border-right-0"
                      placeholder="Tìm cuộc trò chuyện khách hàng..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                    />
                    <div className="input-group-append">
                      <span className="input-group-text bg-white border-left-0 text-muted">
                        <i className="fas fa-search"></i>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Conversations Threads list */}
                <div
                  className="list-group list-group-flush overflow-auto"
                  style={{ flex: 1 }}
                >
                  {loading && conversationList.length === 0 ? (
                    <div className="p-4 text-center text-muted">
                      <div
                        className="spinner-border spinner-border-sm mr-2"
                        role="status"
                      ></div>
                      Đang tải tin nhắn...
                    </div>
                  ) : conversationList.length === 0 ? (
                    <div className="p-5 text-center text-muted my-auto">
                      <i className="far fa-comments fa-3x mb-3 text-secondary"></i>
                      <h6 className="font-weight-bold text-muted">
                        Hộp thư trống
                      </h6>
                      <p className="small text-muted mb-0">
                        Chưa có tin nhắn hỗ trợ nào từ khách hàng.
                      </p>
                    </div>
                  ) : (
                    conversationList.map((conv) => {
                      const isActive =
                        selectedUser && selectedUser.userId === conv.userId;
                      const initial = getFirstLetter(conv.fullName);
                      return (
                        <button
                          key={conv.userId}
                          type="button"
                          className={`list-group-item list-group-item-action border-0 d-flex align-items-center p-3 ${isActive ? "bg-light font-weight-bold" : ""}`}
                          onClick={() => {
                            setSelectedUser(conv);
                            setError("");
                          }}
                          style={{
                            borderLeft: isActive
                              ? "4px solid #007bff"
                              : "4px solid transparent",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div
                            className="rounded-circle mr-3 bg-warning text-dark font-weight-bold d-flex align-items-center justify-content-center"
                            style={{
                              width: 44,
                              height: 44,
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {initial}
                          </div>
                          <div className="text-left w-100 text-truncate">
                            <div className="d-flex justify-content-between align-items-center">
                              <span
                                className="text-dark font-weight-bold"
                                style={{ fontSize: "14px" }}
                              >
                                {conv.fullName}
                              </span>
                              <span
                                className={`badge ${conv.status === "Đã phan hoi" ? "badge-success" : "badge-warning"}`}
                                style={{ fontSize: "9px" }}
                              >
                                {conv.status === "Đã phan hoi"
                                  ? "Đã phản hồi"
                                  : "Mỗi"}
                              </span>
                            </div>
                            <small
                              className="text-muted d-block text-truncate"
                              style={{ fontSize: "12px", maxWidth: "220px" }}
                            >
                              {conv.lastMessage}
                            </small>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (8/12): Khung Chatbox chình của Admin */}
            <div className="col-lg-8 mb-4">
              <div className="hsv-chat-container" style={{ height: 620 }}>
                {selectedUser ? (
                  <>
                    {/* Chatbox Header */}
                    <div className="hsv-chat-header border-bottom">
                      <div className="hsv-chat-header-info">
                        <div
                          className="hsv-chat-header-avatar bg-warning text-dark"
                          style={{ border: "2px solid #fff9db" }}
                        >
                          {getFirstLetter(selectedUser.fullName)}
                        </div>
                        <div className="hsv-chat-header-title">
                          <h6>{selectedUser.fullName}</h6>
                          <div className="hsv-chat-status">
                            <small className="text-muted">
                              <i className="far fa-envelope mr-1"></i>{" "}
                              {selectedUser.email || "Khách vãng lai"}
                            </small>
                          </div>
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border-0 rounded-circle"
                          onClick={() => loadMessages(false)}
                          disabled={loading}
                          title="Làm mới cuộc trò chuyện"
                          style={{ width: 38, height: 38 }}
                        >
                          <i
                            className={`fas fa-sync-alt ${loading ? "fa-spin" : ""}`}
                          ></i>
                        </button>
                      </div>
                    </div>

                    {/* Chatbox Body (Bong bóng chat hội thoại) */}
                    <div className="hsv-chat-body" ref={chatBodyRef}>
                      {activeHistory.map((msg) => (
                        <React.Fragment key={msg.id}>
                          {/* 1. Tin nhắn của User (Bên Trái) */}
                          <div
                            className="hsv-chat-row admin-row"
                            style={{ alignSelf: "flex-start" }}
                          >
                            <div className="hsv-chat-bubble-avatar user-avatar bg-warning text-dark">
                              {getFirstLetter(msg.fullName)}
                            </div>
                            <div className="hsv-chat-content-group">
                              <div className="hsv-chat-bubble bg-white border border-light">
                                <div>{msg.message}</div>
                                {/* Hiển thị ảnh đính kèm của User nếu có */}
                                {msg.imageUrl && (
                                  <div
                                    className="mt-2 text-center border rounded p-1 bg-white shadow-sm"
                                    style={{
                                      maxWidth: "240px",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <img
                                      src={msg.imageUrl}
                                      alt="Ảnh đính kèm"
                                      className="img-fluid rounded"
                                      style={{
                                        maxHeight: "180px",
                                        objectFit: "contain",
                                        cursor: "zoom-in",
                                      }}
                                      onClick={() =>
                                        window.open(msg.imageUrl, "_blank")
                                      }
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="hsv-chat-meta">
                                {formatDateTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* 2. Tin nhắn phản hồi của Admin (Bên Phải) nếu có */}
                          {msg.adminReply &&
                            (() => {
                              const adminInfo = getAdminNameAndInitial(msg);
                              return (
                                <div
                                  className="hsv-chat-row user-row"
                                  style={{ alignSelf: "flex-end" }}
                                >
                                  <div
                                    className={`hsv-chat-bubble-avatar admin-avatar ${adminInfo.bgClass}`}
                                  >
                                    {adminInfo.initial}
                                  </div>
                                  <div className="hsv-chat-content-group">
                                    <div
                                      className="hsv-chat-bubble bg-primary text-white border-0"
                                      style={{ borderBottomRightRadius: "4px" }}
                                    >
                                      {msg.adminReply}
                                    </div>
                                    <div className="hsv-chat-meta">
                                      {formatDateTime(msg.repliedAt)}
                                      <span className="ml-2 font-italic small text-muted font-weight-bold">
                                        ({adminInfo.name})
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                        </React.Fragment>
                      ))}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Chatbox Input (Footer) */}
                    <div className="hsv-chat-input-area border-top">
                      {success && (
                        <div className="alert alert-success py-2 px-3 mb-2 small">
                          {success}
                        </div>
                      )}
                      {error && (
                        <div
                          className="alert alert-danger alert-dismissible fade show py-2 px-3 mb-2 small"
                          role="alert"
                        >
                          {error}
                          <button
                            type="button"
                            className="close py-2"
                            onClick={() => setError("")}
                            aria-label="Close"
                          >
                            <span aria-hidden="true">&times;</span>
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendReply}>
                        <div className="hsv-chat-input-group">
                          <input
                            type="text"
                            className="hsv-chat-input"
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder={
                              isListening
                                ? "Đang lắng nghe phản hồi của bạn..."
                                : `Phản hồi cho ${selectedUser.fullName}...`
                            }
                            disabled={submitting}
                            required
                          />

                          {/* Microphone Button (Speech to Text dành cho Admin) */}
                          <button
                            type="button"
                            className={`hsv-chat-mic-btn mr-2 ${isListening ? "active" : "text-primary"}`}
                            onClick={toggleListening}
                            disabled={submitting}
                            title={
                              isListening
                                ? "Đang ghi âm - Bấm để dừng"
                                : "Nói để nhập chữ (Speech to Text)"
                            }
                          >
                            <i className="fas fa-microphone"></i>
                          </button>

                          {/* Send Button */}
                          <button
                            type="submit"
                            className="hsv-chat-send-btn"
                            disabled={submitting || !replyInput.trim()}
                            title="Gửi phản hồi"
                            style={{
                              backgroundColor: "#007bff",
                              color: "#ffffff",
                            }}
                          >
                            {submitting ? (
                              <span
                                className="spinner-border spinner-border-sm"
                                role="status"
                              ></span>
                            ) : (
                              <i className="fas fa-paper-plane"></i>
                            )}
                          </button>
                        </div>
                      </form>
                    </div>
                  </>
                ) : (
                  <div className="my-auto text-center py-5 text-muted">
                    <i className="far fa-comments fa-4x mb-3 text-secondary"></i>
                    <h6 className="font-weight-bold">
                      Bắt đầu hỗ trợ trực tuyến
                    </h6>
                    <p className="small text-muted mb-0">
                      Chọn một cuộc trò chuyện từ thanh bên trái để bắt đầu nhắn
                      tin hỗ trợ khách hàng.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminMessages;
