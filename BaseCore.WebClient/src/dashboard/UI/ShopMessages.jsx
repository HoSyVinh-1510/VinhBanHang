import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { messageApi } from "../../services/api";
import ShopShell from "./components_UI/ShopShell";
import useMultiShopStyles from "./components_UI/useMultiShopStyles";

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

// Static Admin list for User to select
const systemAdmins = [
  { id: "admin_all", name: "Ban quản trị HSV", position: "Hỗ trợ chung", initial: "H", avatarClass: "bg-warning text-dark" },
  { id: "admin_vinh", name: "Admin Vinh (Hồ Sỹ Vinh)", position: "Quản lý cửa hàng", initial: "V", avatarClass: "bg-primary text-white" },
  { id: "admin_tuan", name: "Admin Tuấn (Kỹ thuật)", position: "Hỗ trợ kỹ thuật", initial: "T", avatarClass: "bg-success text-white" }
];

const ShopMessages = () => {
  useMultiShopStyles();

  const navigate = useNavigate();
  const { user, logout, isAdmin } = useAuth();
  const isUserAdmin = isAdmin();
  
  // Shared States
  const [searchInput, setSearchInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // --- USER VIEW STATES ---
  const [inputMessage, setInputMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState(""); // Holds Base64 Data URL for any attachment
  const [selectedAdmin, setSelectedAdmin] = useState(systemAdmins[0]);
  const [userMessages, setUserMessages] = useState([]);
  const [allUserMessages, setAllUserMessages] = useState([]); // Raw unfiltered user messages
  
  // --- ADMIN VIEW STATES ---
  const [allMessages, setAllMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [replyInput, setReplyInput] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const chatEndRef = useRef(null);
  const chatBodyRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to the bottom of the chat list container (without scrolling the main browser window)
  const scrollToBottom = useCallback((behavior = "smooth") => {
    setTimeout(() => {
      if (chatBodyRef.current) {
        chatBodyRef.current.scrollTo({
          top: chatBodyRef.current.scrollHeight,
          behavior
        });
      }
    }, 100);
  }, []);

  // Helper to identify current admin details
  const getAdminIdentity = useCallback((usr) => {
    if (!usr) return { id: "admin_all", name: "Ban quản trị HSV" };
    const username = (usr.username || "").toLowerCase();
    const name = (usr.name || "").toLowerCase();
    
    if (username.includes("vinh") || name.includes("vinh")) {
      return { id: "admin_vinh", name: "Admin Vinh (Hồ Sỹ Vinh)" };
    }
    if (username.includes("tuan") || name.includes("tuan")) {
      return { id: "admin_tuan", name: "Admin Tuấn (Kỹ thuật)" };
    }
    return { id: "admin_all", name: "Ban quản trị HSV" };
  }, []);

  // Helper to extract admin info from message subject dynamically
  const getAdminNameAndInitial = useCallback((msg) => {
    const subjectLower = (msg.subject || "").toLowerCase();
    if (subjectLower.includes("tuan") || subjectLower.includes("tuấn")) {
      return { name: "Admin Tuấn", initial: "T", bgClass: "bg-success text-white" };
    }
    if (subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh")) {
      return { name: "Admin Vinh", initial: "V", bgClass: "bg-primary text-white" };
    }
    return { name: "Ban quản trị HSV", initial: "H", bgClass: "bg-warning text-dark" };
  }, []);

  // Helper to count pending customer messages sent to a specific admin
  const getAdminPendingCount = useCallback((adminId) => {
    return allUserMessages.filter(m => {
      const subjectLower = (m.subject || "").toLowerCase();
      let belongs = false;
      if (adminId === "admin_vinh") {
        belongs = subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh");
      } else if (adminId === "admin_tuan") {
        belongs = subjectLower.includes("tuan") || subjectLower.includes("tuấn");
      } else if (adminId === "admin_all") {
        belongs = subjectLower.includes("ban quản trị") || 
                  subjectLower.includes("hsv") || 
                  (!subjectLower.includes("vinh") && !subjectLower.includes("tuan"));
      }
      return belongs && m.status !== "Đã phan hoi" && !m.adminReply;
    }).length;
  }, [allUserMessages]);

  // Load User chat history with selected Admin
  const loadUserHistory = useCallback(async (isInitial = false) => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const response = await messageApi.getMyMessages();
      const sorted = (response.data || []).slice().sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setAllUserMessages(sorted);

      let filtered = sorted.filter(m => {
        const subjectLower = (m.subject || "").toLowerCase();
        
        if (selectedAdmin.id === "admin_vinh") {
          return subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh");
        }
        if (selectedAdmin.id === "admin_tuan") {
          return subjectLower.includes("tuan") || subjectLower.includes("tuấn");
        }
        if (selectedAdmin.id === "admin_all") {
          return subjectLower.includes("ban quản trị") || 
                 subjectLower.includes("hsv") || 
                 (!subjectLower.includes("vinh") && !subjectLower.includes("tuan"));
        }
        return false;
      });
      
      setUserMessages(filtered);
      if (isInitial || filtered.length > 0) {
        scrollToBottom(isInitial ? "auto" : "smooth");
      }
    } catch (err) {
      console.error("Không thể tải l9ch sử tin nhắn", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user, selectedAdmin, scrollToBottom]);

  // Load Admin chat threads and active user histories
  const loadAdminHistory = useCallback(async (isInitial = false) => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const response = await messageApi.getAll(1, 100);
      const rawMessages = response.data?.items || [];
      const sorted = rawMessages.slice().sort(
        (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
      );
      
      setAllMessages(sorted);
      
      // Auto-select first thread if none is selected
      const currentAdm = getAdminIdentity(user);
      const filtered = sorted.filter(m => {
        const subjectLower = (m.subject || "").toLowerCase();
        if (currentAdm.id === "admin_vinh") {
          return subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh");
        }
        if (currentAdm.id === "admin_tuan") {
          return subjectLower.includes("tuan") || subjectLower.includes("tuấn");
        }
        if (currentAdm.id === "admin_all") {
          return subjectLower.includes("ban quản trị") || 
                 subjectLower.includes("hsv") || 
                 (!subjectLower.includes("vinh") && !subjectLower.includes("tuan"));
        }
        return false;
      });

      if (filtered.length > 0 && !selectedUser) {
        const uniqueUserIds = Array.from(new Set(filtered.map(m => m.userId || m.fullName)));
        if (uniqueUserIds.length > 0) {
          const firstUserId = uniqueUserIds[0];
          const firstUserMsg = filtered.find(m => (m.userId || m.fullName) === firstUserId);
          setSelectedUser({
            userId: firstUserMsg.userId || firstUserMsg.fullName,
            fullName: firstUserMsg.fullName,
            email: firstUserMsg.email
          });
        }
      }

      if (isInitial || sorted.length > 0) {
        scrollToBottom(isInitial ? "auto" : "smooth");
      }
    } catch (err) {
      console.error("Không thể tải danh sách h  trợ của Admin", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [user, selectedUser, scrollToBottom, getAdminIdentity]);

  // Load correct lists based on user role
  useEffect(() => {
    if (isUserAdmin) {
      loadAdminHistory(true);
    } else {
      loadUserHistory(true);
    }
  }, [selectedAdmin, selectedUser, isUserAdmin]);

  // Speech Recognition initialization
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
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
          if (isUserAdmin) {
            setReplyInput((current) => {
              const cleanCurrent = current.trim();
              return cleanCurrent ? `${cleanCurrent} ${transcript}` : transcript;
            });
          } else {
            setInputMessage((current) => {
              const cleanCurrent = current.trim();
              return cleanCurrent ? `${cleanCurrent} ${transcript}` : transcript;
            });
          }
        }
      };

      rec.onerror = (err) => {
        console.error("Lỗi nhận diện giọng nói", err);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [isUserAdmin]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError("Trình duyệt của bạn không hỗ trợ tính năng nhận diện giọng nói (Speech to Text).");
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

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(query ? `/shop/list?q=${encodeURIComponent(query)}` : "/shop/list");
  };

  // --- LOCAL & CLIPBOARD ATTACHMENT HANDLERS ---
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      setError("Kích thước file đính kèm vượt quá 3MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSelectedImage(reader.result);
        setError("");
      }
    };
    reader.onerror = () => {
      setError("Không thể đọc file đính kèm.");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // Handle Ctrl+V Paste from Clipboard (Supports images copied from snipping tools or file copying)
  const handlePaste = (event) => {
    const items = event.clipboardData?.items;
    const files = event.clipboardData?.files;
    
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 3 * 1024 * 1024) {
        setError("Kích thước file từ clipboard vượt quá 3MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setSelectedImage(reader.result);
          setError("");
        }
      };
      reader.onerror = () => {
        setError("Không thể đọc file từ clipboard.");
      };
      reader.readAsDataURL(file);
      event.preventDefault();
      return;
    }

    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (!file) continue;

          if (file.size > 3 * 1024 * 1024) {
            setError("Kích thước file từ clipboard vượt quá 3MB.");
            return;
          }

          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") {
              setSelectedImage(reader.result);
              setError("");
            }
          };
          reader.onerror = () => {
            setError("Không thể đọc file từ clipboard.");
          };
          reader.readAsDataURL(file);
          event.preventDefault();
          break;
        }
      }
    }
  };

  // --- USER ATTACHMENT RENDERING LOGIC ---
  const renderAttachment = (url) => {
    if (!url) return null;
    
    // Check if attachment is a Base64 image or matches image extensions
    if (url.startsWith("data:image/") || url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) {
      return (
        <div className="mt-2 text-center border rounded p-1 bg-white shadow-sm" style={{ maxWidth: "240px", overflow: "hidden" }}>
          <img
            src={url}
            alt="Ảnh đính kèm"
            className="img-fluid rounded"
            style={{ maxHeight: "180px", objectFit: "contain", cursor: "zoom-in" }}
            onClick={() => window.open(url, "_blank")}
          />
        </div>
      );
    }
    
    // Otherwise render as download card (e.g. PDF, zip, docx, txt)
    const fileType = url.split(";")[0]?.split(":")[1] || "file/unknown";
    return (
      <div className="mt-2 border rounded p-2 bg-light shadow-sm d-flex align-items-center text-left" style={{ maxWidth: "260px", borderLeft: "4px solid #ffd333" }}>
        <div className="bg-primary text-white rounded p-2 mr-3 d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, flexShrink: 0 }}>
          <i className="fas fa-file-alt fa-lg"></i>
        </div>
        <div className="overflow-hidden w-100">
          <small className="font-weight-bold text-truncate d-block text-dark" style={{ fontSize: "12px" }}>File Đính Kèm</small>
          <small className="text-muted d-block text-truncate" style={{ fontSize: "10px" }}>{fileType}</small>
          <a href={url} download="attachment" className="btn btn-sm btn-link p-0 text-primary font-weight-bold text-left d-inline-block mt-1" style={{ fontSize: "11px" }}>
            <i className="fas fa-download mr-1"></i> Tải xuống file
          </a>
        </div>
      </div>
    );
  };

  // --- USER EVENT HANDLERS ---
  const handleUserSubmitMessage = async (event) => {
    event.preventDefault();
    const cleanMsg = inputMessage.trim();
    if (!cleanMsg && !selectedImage) return;

    setSubmitting(true);
    setError("");
    
    const fullName = user?.name || user?.username || "Khách hàng";
    const email = user?.email || "";
    const subject = `Hỗ trợ gửi tới ${selectedAdmin.name}`;

    try {
      await messageApi.create({
        fullName,
        email: email || null,
        subject,
        message: cleanMsg || "Đã gửi một hình ảnh / tài liệu",
        imageUrl: selectedImage || null
      });

      setInputMessage("");
      setSelectedImage("");
      await loadUserHistory(false);
      scrollToBottom("smooth");
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Không thể gửi tin nhắn.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- ADMIN EVENT HANDLERS & COMPUTATIONS ---
  const currentAdmin = getAdminIdentity(user);

  const getFilteredAdminMessages = () => {
    return allMessages.filter(m => {
      const subjectLower = (m.subject || "").toLowerCase();
      if (currentAdmin.id === "admin_vinh") {
        return subjectLower.includes("vinh") || subjectLower.includes("hồ sỹ vinh");
      }
      if (currentAdmin.id === "admin_tuan") {
        return subjectLower.includes("tuan") || subjectLower.includes("tuấn");
      }
      if (currentAdmin.id === "admin_all") {
        return subjectLower.includes("ban quản trị") || 
               subjectLower.includes("hsv") || 
               (!subjectLower.includes("vinh") && !subjectLower.includes("tuan"));
      }
      return false;
    });
  };

  const adminMessages = getFilteredAdminMessages();

  const getAdminConversations = () => {
    const uniqueThreads = {};
    
    adminMessages.forEach((msg) => {
      const key = msg.userId || msg.fullName;
      if (!uniqueThreads[key]) {
        uniqueThreads[key] = {
          userId: msg.userId || msg.fullName,
          fullName: msg.fullName,
          email: msg.email,
          lastMessage: msg.message,
          lastTime: msg.createdAt,
          status: msg.status,
          pendingCount: 0
        };
      }
      
      uniqueThreads[key].lastMessage = msg.message;
      uniqueThreads[key].lastTime = msg.createdAt;
      uniqueThreads[key].status = msg.status;
      
      // Calculate unreplied customer messages count
      if (msg.status !== "Đã phan hoi" && !msg.adminReply) {
        uniqueThreads[key].pendingCount += 1;
      }
    });

    let list = Object.values(uniqueThreads);
    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      list = list.filter(u => u.fullName.toLowerCase().includes(q));
    }

    return list.sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime));
  };

  const getActiveChatHistoryForAdmin = () => {
    if (!selectedUser) return [];
    return adminMessages.filter(
      (m) => (m.userId || m.fullName) === selectedUser.userId
    );
  };

  const handleAdminSubmitReply = async (event) => {
    event.preventDefault();
    if (!replyInput.trim() || !selectedUser) return;

    setSubmitting(true);
    setError("");

    const activeAdminMessages = getActiveChatHistoryForAdmin();
    if (activeAdminMessages.length === 0) {
      setError("Không tìm thấy tin nhắn nào của người dùng đề trả lời.");
      setSubmitting(false);
      return;
    }

    const latestMessage = activeAdminMessages[activeAdminMessages.length - 1];

    try {
      await messageApi.reply(latestMessage.id, replyInput.trim());
      setReplyInput("");
      await loadAdminHistory(false);
      scrollToBottom("smooth");
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Không thể gửi phản hồi.");
    } finally {
      setSubmitting(false);
    }
  };

  const getFirstLetter = (name) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  return (
    <ShopShell
      activeRoute="messages"
      userName={user?.name || user?.username}
      onLogout={handleLogout}
      isAdmin={isAdmin()}
      onGoAdmin={() => navigate("/")}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      onSearchSubmit={handleSearchSubmit}
    >
      <div className="container-fluid shop-page-surface">
        <div className="row px-xl-5">
          <div className="col-12">
            <h5 className="section-title position-relative text-uppercase mb-4">
              <span className="bg-secondary pr-3">HSV Messenger</span>
            </h5>
          </div>
        </div>

        {isUserAdmin ? (
          /* ======================================================== */
          /* RENDER ADMIN MESSENGER VIEW (Inside storefront ShopShell) */
          /* ======================================================== */
          <div className="row px-xl-5">
            {/* CỘT TRÁI (4/12): Danh sách các User Chat (Sidebar) */}
            <div className="col-lg-4 mb-4">
              <div className="bg-white border rounded shadow-sm overflow-hidden" style={{ height: 600, display: "flex", flexDirection: "column" }}>
                <div className="p-3 border-bottom bg-light">
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
                
                <div className="list-group list-group-flush overflow-auto" style={{ flex: 1 }}>
                  {getAdminConversations().length === 0 ? (
                    <div className="p-5 text-center text-muted my-auto">
                      <i className="far fa-comments fa-3x mb-3 text-secondary"></i>
                      <h6 className="font-weight-bold text-muted">Hộp thư trống</h6>
                      <p className="small text-muted mb-0">Chưa có tin nhắn hỗ trợ nào từ khách hàng.</p>
                    </div>
                  ) : (
                    getAdminConversations().map((conv) => {
                      const isActive = selectedUser && selectedUser.userId === conv.userId;
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
                          style={{ borderLeft: isActive ? "4px solid #ffd333" : "4px solid transparent", transition: "all 0.15s ease" }}
                        >
                          <div className="rounded-circle mr-3 bg-warning text-dark font-weight-bold d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, fontSize: 18, flexShrink: 0 }}>
                            {initial}
                          </div>
                          <div className="text-left w-100 text-truncate">
                            <div className="d-flex justify-content-between align-items-center">
                              <span className="text-dark font-weight-bold" style={{ fontSize: "14px" }}>{conv.fullName}</span>
                              {conv.pendingCount > 0 ? (
                                <span className="badge badge-danger badge-pill px-2 py-1 font-weight-bold" style={{ fontSize: "10px", borderRadius: "10px" }}>
                                  {conv.pendingCount}
                                </span>
                              ) : (
                                <span className="badge badge-success px-2 py-1 text-white font-weight-bold" style={{ fontSize: "10px", borderRadius: "10px" }}>
                                  Đã xong
                                </span>
                              )}
                            </div>
                            <small className="text-muted d-block text-truncate" style={{ fontSize: "12px", maxWidth: "220px" }}>{conv.lastMessage}</small>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (8/12): Khung Chatbox phản hồi của Admin */}
            <div className="col-lg-8 mb-4">
              <div className="hsv-chat-container">
                {selectedUser ? (
                  <>
                    {/* Chatbox Header */}
                    <div className="hsv-chat-header">
                      <div className="hsv-chat-header-info">
                        <div className="hsv-chat-header-avatar bg-warning text-dark" style={{ border: "2px solid #fff9db" }}>
                          {getFirstLetter(selectedUser.fullName)}
                        </div>
                        <div className="hsv-chat-header-title">
                          <h6>{selectedUser.fullName}</h6>
                          <div className="hsv-chat-status">
                            <small className="text-muted"><i className="far fa-envelope mr-1"></i> {selectedUser.email || "Khách vãng lai"}</small>
                          </div>
                        </div>
                      </div>
                      <div>
                        <button
                          type="button"
                          className="btn btn-sm btn-light border-0 rounded-circle"
                          onClick={() => loadAdminHistory(false)}
                          disabled={loadingHistory}
                          title="Làm mới cuộc trò chuyện"
                          style={{ width: 38, height: 38 }}
                        >
                          <i className={`fas fa-sync-alt ${loadingHistory ? "fa-spin" : ""}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Chatbox Body */}
                    <div className="hsv-chat-body" ref={chatBodyRef}>
                      {getActiveChatHistoryForAdmin().map((msg) => (
                        <React.Fragment key={msg.id}>
                          {/* 1. Tin nhắn của User (Bên Trái) */}
                          <div className="hsv-chat-row admin-row" style={{ alignSelf: "flex-start" }}>
                            <div className="hsv-chat-bubble-avatar user-avatar bg-warning text-dark">
                              {getFirstLetter(msg.fullName)}
                            </div>
                            <div className="hsv-chat-content-group">
                              <div className="hsv-chat-bubble bg-white border border-light" style={{ color: "#333333" }}>
                                <div>{msg.message}</div>
                                {renderAttachment(msg.imageUrl)}
                              </div>
                              <div className="hsv-chat-meta">
                                {formatDateTime(msg.createdAt)}
                              </div>
                            </div>
                          </div>

                          {/* 2. Tin nhắn phản hồi của Admin (Bên Phải) */}
                          {msg.adminReply && (() => {
                            const adminInfo = getAdminNameAndInitial(msg);
                            return (
                              <div className="hsv-chat-row user-row" style={{ alignSelf: "flex-end" }}>
                                <div className={`hsv-chat-bubble-avatar admin-avatar ${adminInfo.bgClass}`}>
                                  {adminInfo.initial}
                                </div>
                                <div className="hsv-chat-content-group">
                                  <div className="hsv-chat-bubble bg-primary text-white border-0" style={{ borderBottomRightRadius: "4px" }}>
                                    {msg.adminReply}
                                  </div>
                                  <div className="hsv-chat-meta">
                                    {formatDateTime(msg.repliedAt)}
                                    <span className="ml-2 font-italic small text-muted font-weight-bold">({adminInfo.name})</span>
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
                    <div className="hsv-chat-input-area">
                      {error && (
                        <div className="alert alert-danger alert-dismissible fade show py-2 px-3 mb-2 small" role="alert">
                          {error}
                          <button type="button" className="close py-2" onClick={() => setError("")} aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleAdminSubmitReply}>
                        <div className="hsv-chat-input-group">
                          <input
                            type="text"
                            className="hsv-chat-input"
                            value={replyInput}
                            onChange={(e) => setReplyInput(e.target.value)}
                            placeholder={isListening ? "Đang lắng nghe phản hồi của bạn..." : `Phản hồi cho ${selectedUser.fullName}...`}
                            disabled={submitting}
                            required
                          />

                          {/* Microphone Button (Speech to Text) */}
                          <button
                            type="button"
                            className={`hsv-chat-mic-btn mr-2 ${isListening ? "active" : "text-primary"}`}
                            onClick={toggleListening}
                            disabled={submitting}
                            title={isListening ? "Đang ghi âm - Bấm đề dừng" : "Nói đề nhập chữ (Speech to Text)"}
                          >
                            <i className="fas fa-microphone"></i>
                          </button>

                          {/* Send Button */}
                          <button
                            type="submit"
                            className="hsv-chat-send-btn"
                            disabled={submitting || !replyInput.trim()}
                            title="Gửi phản hồi"
                            style={{ backgroundColor: "#ffd333", color: "#3d464d" }}
                          >
                            {submitting ? (
                              <span className="spinner-border spinner-border-sm" role="status"></span>
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
                    <i className="far fa-comments fa-3x mb-3 text-secondary"></i>
                    <h6 className="font-weight-bold">Bắt đầu hỗ trợ trực tuyến</h6>
                    <p className="small text-muted mb-0">Chọn một cuộc trò chuyện từ thanh bên trái đề bắt đầu nhắn tin hỗ trợ khách hàng.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================= */
          /* RENDER USER MESSENGER VIEW (Inside storefront ShopShell) */
          /* ======================================================= */
          <div className="row px-xl-5">
            {/* CỘT TRÁI (4/12): Danh sách các Admin (Sidebar Zalo/Mess) */}
            <div className="col-lg-4 mb-4">
              <div className="bg-white border rounded shadow-sm overflow-hidden" style={{ height: 600, display: "flex", flexDirection: "column" }}>
                <div className="p-3 border-bottom bg-light">
                  <h6 className="font-weight-bold mb-0 text-dark"><i className="fas fa-users mr-2 text-primary"></i> Ban quản trị & Hỗ trợ</h6>
                  <small className="text-muted">Chọn Admin đề bắt đầu cuộc hội thoại riêng</small>
                </div>
                <div className="list-group list-group-flush overflow-auto" style={{ flex: 1 }}>
                  {systemAdmins.map((adm) => {
                    const isActive = selectedAdmin.id === adm.id;
                    const pendingCount = getAdminPendingCount(adm.id);
                    return (
                      <button
                        key={adm.id}
                        type="button"
                        className={`list-group-item list-group-item-action border-0 d-flex align-items-center p-3 ${isActive ? "bg-light font-weight-bold" : ""}`}
                        onClick={() => {
                          setSelectedAdmin(adm);
                          setError("");
                        }}
                        style={{ borderLeft: isActive ? "4px solid #ffd333" : "4px solid transparent", transition: "all 0.15s ease" }}
                      >
                        <div className={`rounded-circle mr-3 d-flex align-items-center justify-content-center ${adm.avatarClass}`} style={{ width: 44, height: 44, fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                          {adm.initial}
                        </div>
                        <div className="text-left w-100 text-truncate">
                          <div className="d-flex justify-content-between align-items-center">
                            <span className="text-dark font-weight-bold" style={{ fontSize: "14px" }}>{adm.name}</span>
                            {pendingCount > 0 && (
                              <span className="badge badge-warning badge-pill px-2 py-1 font-weight-bold text-dark animate-pulse" style={{ fontSize: "10px", borderRadius: "10px" }}>
                                Chờ {pendingCount}
                              </span>
                            )}
                          </div>
                          <small className="text-muted">{adm.position}</small>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="p-3 bg-light border-top text-center text-muted small">
                  <i className="fas fa-lock mr-1"></i> Cuộc trò chuyện được bảo mật nội bộ.
                </div>
              </div>
            </div>

            {/* CỘT PHẢI (8/12): Messenger/Zalo Chatbox Container */}
            <div className="col-lg-8 mb-4">
              <div className="hsv-chat-container">
                {/* Chatbox Header */}
                <div className="hsv-chat-header">
                  <div className={`hsv-chat-header-avatar ${selectedAdmin.avatarClass}`} style={{ color: "inherit" }}>
                    {selectedAdmin.initial}
                  </div>
                  <div className="hsv-chat-header-title">
                    <h6>{selectedAdmin.name}</h6>
                    <div className="hsv-chat-status">
                      <span className="hsv-chat-status-dot"></span>
                      <small>Đang trực tuyến</small>
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-sm btn-light border-0 rounded-circle"
                      onClick={() => loadUserHistory(false)}
                      disabled={loadingHistory}
                      title="Làm mới cuộc trò chuyện"
                      style={{ width: 38, height: 38 }}
                    >
                      <i className={`fas fa-sync-alt ${loadingHistory ? "fa-spin" : ""}`}></i>
                    </button>
                  </div>
                </div>

                {/* Chatbox Body */}
                <div className="hsv-chat-body" ref={chatBodyRef}>
                  {userMessages.length === 0 && !loadingHistory ? (
                    <div className="my-auto text-center py-5 text-muted">
                      <i className="far fa-comments fa-3x mb-3 text-secondary"></i>
                      <h6 className="font-weight-bold">Bắt đầu trò chuyện với {selectedAdmin.name}</h6>
                      <p className="small mb-0 text-muted">Nhập nội dung cần hỗ trợ và gửi tin nhắn offline đã bên dưới.</p>
                    </div>
                  ) : (
                    <>
                      {userMessages.map((msg) => {
                        const userInitial = getFirstLetter(msg.fullName);
                        return (
                          <React.Fragment key={msg.id}>
                            {/* 1. Tin nhắn của User (Bên Phải) */}
                            <div className="hsv-chat-row user-row">
                              <div className="hsv-chat-bubble-avatar user-avatar" title={msg.fullName}>
                                {userInitial}
                              </div>
                              <div className="hsv-chat-content-group">
                                <div className="hsv-chat-bubble d-flex flex-column align-items-end">
                                  <div>{msg.message}</div>
                                  {renderAttachment(msg.imageUrl)}
                                </div>
                                <div className="hsv-chat-meta">
                                  {formatDateTime(msg.createdAt)}
                                  {msg.status === "Đã phan hoi" ? (
                                    <span className="text-success ml-2"><i className="fas fa-check-double"></i> Đã trả lời</span>
                                  ) : (
                                    <span className="text-warning ml-2"><i className="fas fa-check"></i> Đang chờ</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 2. Tin nhắn phản hồi của Admin (Bên Trái) */}
                            {msg.adminReply && (() => {
                              const adminInfo = getAdminNameAndInitial(msg);
                              return (
                                <div className="hsv-chat-row admin-row">
                                  <div className={`hsv-chat-bubble-avatar admin-avatar ${adminInfo.bgClass}`} title={adminInfo.name}>
                                    {adminInfo.initial}
                                  </div>
                                  <div className="hsv-chat-content-group">
                                    <div className="hsv-chat-bubble">
                                      {msg.adminReply}
                                    </div>
                                    <div className="hsv-chat-meta">
                                      {formatDateTime(msg.repliedAt)}
                                      <span className="ml-2 font-italic small text-muted">({adminInfo.name})</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </React.Fragment>
                        );
                      })}
                    </>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* File/Ảnh xem trước khi đính kèm */}
                {selectedImage && (
                  <div className="px-3 py-2 bg-light border-top d-flex align-items-center">
                    <div className="position-relative d-inline-block border rounded p-1 bg-white shadow-sm" style={{ width: 70, height: 70 }}>
                      {selectedImage.startsWith("data:image/") ? (
                        <img 
                          src={selectedImage} 
                          alt="Đính kèm" 
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 8 }} 
                        />
                      ) : (
                        <div className="bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: "100%", height: "100%", borderRadius: 8 }}>
                          <i className="fas fa-file-alt fa-2x"></i>
                        </div>
                      )}
                      <button 
                        type="button" 
                        className="position-absolute bg-danger text-white border-0 rounded-circle d-flex align-items-center justify-content-center"
                        style={{ top: -8, right: -8, width: 22, height: 22, fontSize: 11, cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.15)" }}
                        onClick={() => setSelectedImage("")}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div className="ml-3 small text-muted">
                      <i className="fas fa-paperclip mr-1"></i> File / Ảnh đã được đính kèm thành công. Bấm nút gửi đề hoàn tất.
                    </div>
                  </div>
                )}

                {/* Chatbox Input (Footer) */}
                <div className="hsv-chat-input-area">
                  {error && (
                    <div className="alert alert-danger alert-dismissible fade show py-2 px-3 mb-2 small" role="alert">
                      {error}
                      <button type="button" className="close py-2" onClick={() => setError("")} aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                      </button>
                    </div>
                  )}
                  
                  <form onSubmit={handleUserSubmitMessage}>
                    <div className="hsv-chat-input-group">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                        style={{ display: "none" }}
                      />

                      {/* Nút đính kèm ảnh */}
                      <button
                        type="button"
                        className="btn text-muted border-0 mr-2 p-2"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={submitting}
                        title="Đính kèm ảnh hoặc tài liệu"
                        style={{ fontSize: "19px", display: "flex", alignItems: "center" }}
                      >
                        <i className="far fa-image"></i>
                      </button>

                      <input
                        type="text"
                        className="hsv-chat-input"
                        value={inputMessage}
                        onChange={(event) => setInputMessage(event.target.value)}
                        onPaste={handlePaste}
                        placeholder={isListening ? "Đang lắng nghe giọng nói của bạn..." : `Nhập tin nhắn hoặc Ctrl+V dán file gửi ${selectedAdmin.name}...`}
                        disabled={submitting}
                      />

                      {/* Nút Mic (Speech to Text) */}
                      <button
                        type="button"
                        className={`hsv-chat-mic-btn mr-2 ${isListening ? "active" : "text-primary"}`}
                        onClick={toggleListening}
                        disabled={submitting}
                        title={isListening ? "Đang ghi âm - Bấm đề dừng" : "Nói đề nhập chữ (Speech to Text)"}
                      >
                        <i className="fas fa-microphone"></i>
                      </button>

                      {/* Nút gửi */}
                      <button
                        type="submit"
                        className="hsv-chat-send-btn"
                        disabled={submitting || (!inputMessage.trim() && !selectedImage)}
                        title="Gửi tin nhắn"
                        style={{ backgroundColor: "#ffd333", color: "#3d464d" }}
                      >
                        {submitting ? (
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                        ) : (
                          <i className="fas fa-paper-plane"></i>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ShopShell>
  );
};

export default ShopMessages;

