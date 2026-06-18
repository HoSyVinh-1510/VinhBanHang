# 🏗 Kiến trúc Backend của Dự án

Dự án này được thiết kế theo cấu trúc **N-Tier Architecture / Microservices Pattern**. Các thành phần được tách biệt nhằm phục vụ mục đích mở rộng trong tương lai. Để bạn không bị bối rối khi tìm file, đây là sơ đồ chi tiết chức năng của từng thành phần:

## 🧭 Bản Đồ Dự Án (Project Map)

### 1️⃣ Nhóm Các Dự án Cốt Lõi (Core Services)
Các dịch vụ chạy chính của hệ thống. 
- **`BaseCore.AuthService`**: Microservice quản lý việc Đăng nhập, Đăng ký, Cấp phát Token (JWT) và Quản lý Role (User/Admin). Khi khởi động, dự án này thường chạy trên cổng 5001.
- **`BaseCore.APIService`**: Microservice quan trọng nhất. Nó chứa toàn bộ logic xử lý nghiệp vụ bán hàng như: Sản phẩm (Products), Giỏ hàng (Cart), Đơn hàng (Orders), Tin nhắn (Messages), Danh mục (Categories). File của bạn thường làm việc nằm ở đây (trong thư mục `Controllers`). Chạy trên cổng 5000.
- **`BaseCore.PromotionsService`**: Một service nhỏ (có thể code bằng Ruby hoặc C#) dùng để tính toán mã giảm giá.
- **`BaseCore.ApiGateway`**: Đóng vai trò là "Người điều hướng" (Cửa ngõ). Mọi Request từ Frontend (React) đều gửi vào đây, sau đó Gateway sẽ điều chuyển request sang Auth hoặc APIService. Chạy trên cổng 5002.

### 2️⃣ Nhóm Thư Viện Chung (Shared Libraries)
Các Project này không tự chạy được mà được các Core Services tham chiếu (nhúng) vào.
- **`BaseCore.Entities`**: Nơi chứa các class Mô hình (Models) khớp với bảng trong cơ sở dữ liệu SQL Server (Ví dụ: `User.cs`, `Order.cs`, `Product.cs`).
- **`BaseCore.DTO`**: Nơi chứa Data Transfer Object - là các object trung gian chứa dữ liệu khi truyền từ Client lên Server và ngược lại. (Đã được tôi quy hoạch gọn gàng).
- **`BaseCore.Repository`**: Nơi chứa logic giao tiếp với Database (Entity Framework Core DbContext). File `SQLServerDbContext.cs` nắm giữ kết nối CSDL nằm ở đây.
- **`BaseCore.Services`**: Nơi chứa các tính năng/thuật toán phức tạp không muốn để lẫn trong Controller (Ví dụ: `NotificationService`).
- **`BaseCore.Libs` / `BaseCore.Common`**: Các file tiện ích chung.

## 🛠 Lời Khuyên cho Lập trình viên
- Khi bạn muốn **thêm tính năng liên quan đến Database**: Sửa `BaseCore.Entities` -> Cập nhật `BaseCore.Repository` -> Thêm class giao tiếp vào `BaseCore.DTO` -> Viết API ở `BaseCore.APIService/Controllers`.
- Hạn chế viết trực tiếp logic truy vấn cơ sở dữ liệu vào trong các file `Controllers`. Luôn thông qua `_repository`. 
- Nếu một class bắt đầu quá dài (hơn 1000 dòng), hãy xem xét bóc tách nó ra một `Service` riêng.
