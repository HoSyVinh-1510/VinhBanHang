using BaseCore.Common;
using BaseCore.DTO;
using BaseCore.Services.Models;
using System;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public class AuthService : IAuthService
    {
        private readonly IUserService _userService;
        private const string SecretKey = "YourSecretKeyForAuthenticationShouldBeLongEnough";
        private const int TokenExpirationMinutes = 480; // 8 hours

        public AuthService(IUserService userService)
        {
            _userService = userService;
        }

        public async Task<ServiceResult<LoginResponse>> LoginAsync(LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return ServiceResult<LoginResponse>.Error("Username and password are required");
            }

            var user = await _userService.Authenticate(request.Username, request.Password);
            if (user == null)
            {
                return ServiceResult<LoginResponse>.Error("Invalid username or password");
            }

            var role = user.UserType == 1 ? "Admin" : "User";

            var token = TokenHelper.GenerateToken(
                SecretKey,
                TokenExpirationMinutes,
                user.Id.ToString(),
                user.UserName,
                role
            );

            var response = new LoginResponse
            {
                Token = token,
                UserId = user.Id.ToString(),
                Username = user.UserName,
                Name = user.Name ?? user.UserName,
                Email = user.Email ?? string.Empty,
                Role = role,
                ExpiresIn = TokenExpirationMinutes * 60
            };

            return ServiceResult<LoginResponse>.Success(response);
        }

        public async Task<ServiceResult<string>> RegisterAsync(RegisterRequest request)
        {
            if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return ServiceResult<string>.Error("Username and password are required");
            }

            if (request.Password.Length < 6)
            {
                return ServiceResult<string>.Error("Password must be at least 6 characters");
            }

            try
            {
                var user = new BaseCore.Entities.User
                {
                    UserName = request.Username,
                    Name = request.Name ?? request.Username,
                    Email = request.Email,
                    Phone = request.Phone,
                    UserType = 0 // Default to regular user
                };

                var createdUser = await _userService.Create(user, request.Password);

                return ServiceResult<string>.Success(createdUser.Id, "Registration successful");
            }
            catch (Exception ex)
            {
                return ServiceResult<string>.Error("Registration failed: " + ex.Message);
            }
        }
    }
}
