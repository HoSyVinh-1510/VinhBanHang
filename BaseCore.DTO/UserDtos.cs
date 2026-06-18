using System;
using System.Collections.Generic;

namespace BaseCore.DTO
{
    public class UserResponse
    {
        public string Id { get; set; } = "";
        public string Username { get; set; } = "";
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Position { get; set; } = "";
        public string? RefundQrImageUrl { get; set; }
        public IEnumerable<RefundQrItemResponse>? RefundQrItems { get; set; }
        public bool IsActive { get; set; }
        public int UserType { get; set; }
        public DateTime Created { get; set; }
    }

    public class CreateUserRequest
    {
        public string Username { get; set; } = "";
        public string Password { get; set; } = "";
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Position { get; set; } = "";
        public string? RefundQrImageUrl { get; set; }
        public int UserType { get; set; }
    }

    public class UpdateUserRequest
    {
        public string Password { get; set; } = "";
        public string Name { get; set; } = "";
        public string Email { get; set; } = "";
        public string Phone { get; set; } = "";
        public string Position { get; set; } = "";
        public string? RefundQrImageUrl { get; set; }
        public int? UserType { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateMyRefundQrRequest
    {
        public string? RefundQrImageUrl { get; set; }
    }

    public class UpsertRefundQrItemRequest
    {
        public string? DisplayName { get; set; }
        public string? QrImageUrl { get; set; }
        public bool IsDefault { get; set; }
    }

    public class RefundQrItemResponse
    {
        public int Id { get; set; }
        public string DisplayName { get; set; } = string.Empty;
        public string QrImageUrl { get; set; } = string.Empty;
        public bool IsDefault { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
