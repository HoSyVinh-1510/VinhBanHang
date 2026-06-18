using BaseCore.Common;
using BaseCore.DTO;
using BaseCore.DTO.Common;
using BaseCore.Entities;
using BaseCore.Repository;
using BaseCore.Repository.Authen;
using BaseCore.Services.Models;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace BaseCore.Services.Authen
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;
        private readonly IUserRefundQrRepository _refundQrRepository;

        public UserService(IUserRepository userRepository, IUserRefundQrRepository refundQrRepository)
        {
            _userRepository = userRepository;
            _refundQrRepository = refundQrRepository;
        }

        public async Task<User> Authenticate(string username, string password)
        {
            if (string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
                return null;

            var user = await _userRepository.GetByUsernameAsync(username);
            if (user == null)
                return null;

            bool isValidPassword = false;
            if (user.Salt != null && user.Salt.Length > 0)
            {
                isValidPassword = TokenHelper.IsValidPassword(password, user.Salt, user.Password);
            }
            else
            {
                isValidPassword = (user.Password == password);
            }

            if (!isValidPassword)
            {
                Console.WriteLine($"Mat khau bi sai: {username}");
                return null;
            }

            Console.WriteLine($"User authenticated successfully: {username}");
            return user;
        }

        public async Task<List<User>> GetAll()
        {
            return await _userRepository.GetAllAsync();
        }

        public async Task<User> GetById(string id)
        {
            return await _userRepository.GetByIdAsync(id);
        }

        public async Task<User> Create(User user, string password)
        {
            byte[] salt;
            user.Password = TokenHelper.HashPassword(password, out salt);
            user.Salt = salt;
            user.Created = DateTime.Now;
            user.IsActive = true;

            await _userRepository.CreateAsync(user);
            return user;
        }

        public async Task Update(User user, string password = null)
        {
            if (!string.IsNullOrEmpty(password))
            {
                byte[] salt;
                user.Password = TokenHelper.HashPassword(password, out salt);
                user.Salt = salt;
            }
            await _userRepository.UpdateAsync(user);
        }

        public async Task Delete(string id)
        {
            await _userRepository.DeleteAsync(id);
        }

        public async Task<ServiceResult<UserResponse>> GetByIdAsync(string id, bool includeRefundQrItems = false)
        {
            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
                return ServiceResult<UserResponse>.Error("User not found");

            var response = await BuildUserResponseAsync(user, includeRefundQrItems);
            return ServiceResult<UserResponse>.Success(response);
        }

        public async Task<ServiceResult<PagedResult<UserResponse>>> SearchAsync(string keyword, bool? isActive, int? userType, int page, int pageSize)
        {
            var (users, totalCount) = await _userRepository.SearchAsync(keyword, isActive, userType, page, pageSize);

            var items = new List<UserResponse>();
            foreach (var user in users)
            {
                items.Add(await BuildUserResponseAsync(user, includeRefundQrItems: false));
            }

            var result = new PagedResult<UserResponse>
            {
                Items = items,
                TotalCount = totalCount,
                Page = page,
                PageSize = pageSize
            };

            return ServiceResult<PagedResult<UserResponse>>.Success(result);
        }

        public async Task<ServiceResult<UserResponse>> CreateAsync(CreateUserRequest request)
        {
            var existingUser = await _userRepository.GetByUsernameAsync(request.Username);
            if (existingUser != null)
                return ServiceResult<UserResponse>.Error("Username already exists");

            var user = new User
            {
                UserName = request.Username,
                Name = request.Name ?? request.Username,
                Email = request.Email,
                Phone = request.Phone,
                Position = request.Position,
                RefundQrImageUrl = NormalizeRefundQrImageUrl(request.RefundQrImageUrl),
                UserType = request.UserType,
                IsActive = true,
                Created = DateTime.Now
            };

            byte[] salt;
            user.Password = TokenHelper.HashPassword(request.Password, out salt);
            user.Salt = salt;

            await _userRepository.CreateAsync(user);
            await EnsureRefundQrSeedFromLegacyAsync(user);

            var response = await BuildUserResponseAsync(user, includeRefundQrItems: false);
            return ServiceResult<UserResponse>.Success(response);
        }

        public async Task<ServiceResult<UserResponse>> UpdateAsync(string id, UpdateUserRequest request)
        {
            var existingUser = await _userRepository.GetByIdAsync(id);
            if (existingUser == null)
                return ServiceResult<UserResponse>.Error("User not found");

            if (!string.IsNullOrEmpty(request.Password))
            {
                byte[] salt;
                existingUser.Password = TokenHelper.HashPassword(request.Password, out salt);
                existingUser.Salt = salt;
            }

            existingUser.Name = request.Name ?? existingUser.Name;
            existingUser.Email = request.Email ?? existingUser.Email;
            existingUser.Phone = request.Phone ?? existingUser.Phone;
            existingUser.Position = request.Position ?? existingUser.Position;

            if (request.UserType.HasValue)
                existingUser.UserType = request.UserType.Value;

            if (request.IsActive.HasValue)
                existingUser.IsActive = request.IsActive.Value;

            if (request.RefundQrImageUrl != null)
                existingUser.RefundQrImageUrl = NormalizeRefundQrImageUrl(request.RefundQrImageUrl);

            await _userRepository.UpdateAsync(existingUser);
            await EnsureRefundQrSeedFromLegacyAsync(existingUser);

            var response = await BuildUserResponseAsync(existingUser, includeRefundQrItems: false);
            return ServiceResult<UserResponse>.Success(response);
        }

        public async Task<ServiceResult<UserResponse>> UpdateMyRefundQrAsync(string userId, UpdateMyRefundQrRequest request)
        {
            var existingUser = await _userRepository.GetByIdAsync(userId);
            if (existingUser == null)
                return ServiceResult<UserResponse>.Error("User not found");

            var normalizedQr = NormalizeRefundQrImageUrl(request.RefundQrImageUrl);
            if (string.IsNullOrWhiteSpace(normalizedQr))
                return ServiceResult<UserResponse>.Error("Vui lòng cung cấp mã QR.");

            var existingItems = await GetRefundQrItemsAsync(userId);
            if (existingItems.Count == 0)
            {
                var created = new UserRefundQr
                {
                    UserId = userId,
                    DisplayName = "Tài khoản mặc định",
                    QrImageUrl = normalizedQr,
                    IsDefault = true,
                    CreatedAt = DateTime.Now
                };
                await _refundQrRepository.AddAsync(created);
            }
            else
            {
                var defaultItem = existingItems.FirstOrDefault(x => x.IsDefault) ?? existingItems.FirstOrDefault();
                if (defaultItem != null)
                {
                    defaultItem.QrImageUrl = normalizedQr;
                    defaultItem.IsDefault = true;
                    defaultItem.UpdatedAt = DateTime.Now;
                    
                    await _refundQrRepository.UpdateAsync(defaultItem);
                    await _refundQrRepository.ClearDefaultsExceptAsync(userId, defaultItem.Id);
                }
            }

            await SyncLegacyUserRefundQrAsync(existingUser);

            var response = await BuildUserResponseAsync(existingUser, includeRefundQrItems: true);
            return ServiceResult<UserResponse>.Success(response);
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string id)
        {
            var existingUser = await _userRepository.GetByIdAsync(id);
            if (existingUser == null)
                return ServiceResult<bool>.Error("User not found");

            await _userRepository.DeleteAsync(id);
            return ServiceResult<bool>.Success(true, "User deleted successfully");
        }

        public async Task<ServiceResult<List<RefundQrItemResponse>>> GetMyRefundQrsAsync(string userId)
        {
            var existingUser = await _userRepository.GetByIdAsync(userId);
            if (existingUser == null)
                return ServiceResult<List<RefundQrItemResponse>>.Error("User not found");

            var items = await GetRefundQrItemsAsync(userId);
            var responses = items.Select(MapRefundQrItemResponse).ToList();
            return ServiceResult<List<RefundQrItemResponse>>.Success(responses);
        }

        public async Task<ServiceResult<RefundQrItemResponse>> CreateMyRefundQrAsync(string userId, UpsertRefundQrItemRequest request)
        {
            var existingUser = await _userRepository.GetByIdAsync(userId);
            if (existingUser == null)
                return ServiceResult<RefundQrItemResponse>.Error("User not found");

            var normalizedQr = NormalizeRefundQrImageUrl(request.QrImageUrl);
            if (string.IsNullOrWhiteSpace(normalizedQr))
                return ServiceResult<RefundQrItemResponse>.Error("Vui lòng cung cấp mã QR.");

            var existingItems = await GetRefundQrItemsAsync(userId);
            bool isFirst = existingItems.Count == 0;
            bool shouldBeDefault = isFirst || request.IsDefault;

            var created = new UserRefundQr
            {
                UserId = userId,
                DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? $"QR #{existingItems.Count + 1}" : request.DisplayName,
                QrImageUrl = normalizedQr,
                IsDefault = shouldBeDefault,
                CreatedAt = DateTime.Now
            };

            await _refundQrRepository.AddAsync(created);

            if (shouldBeDefault)
            {
                await _refundQrRepository.ClearDefaultsExceptAsync(userId, created.Id);
                await SyncLegacyUserRefundQrAsync(existingUser);
            }

            return ServiceResult<RefundQrItemResponse>.Success(MapRefundQrItemResponse(created));
        }

        public async Task<ServiceResult<RefundQrItemResponse>> UpdateMyRefundQrItemAsync(string userId, int id, UpsertRefundQrItemRequest request)
        {
            var existingUser = await _userRepository.GetByIdAsync(userId);
            if (existingUser == null)
                return ServiceResult<RefundQrItemResponse>.Error("User not found");

            var item = await _refundQrRepository.GetByIdAsync(id);
            if (item == null || item.UserId != userId)
                return ServiceResult<RefundQrItemResponse>.Error("Không tìm thấy mã QR này.");

            var normalizedQr = NormalizeRefundQrImageUrl(request.QrImageUrl);
            if (string.IsNullOrWhiteSpace(normalizedQr))
                return ServiceResult<RefundQrItemResponse>.Error("Vui lòng cung cấp mã QR.");

            item.DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? item.DisplayName : request.DisplayName;
            item.QrImageUrl = normalizedQr;
            item.UpdatedAt = DateTime.Now;

            bool originalDefault = item.IsDefault;
            if (request.IsDefault)
            {
                item.IsDefault = true;
            }

            await _refundQrRepository.UpdateAsync(item);

            if (request.IsDefault)
            {
                await _refundQrRepository.ClearDefaultsExceptAsync(userId, item.Id);
                await SyncLegacyUserRefundQrAsync(existingUser);
            }
            else if (originalDefault) // Tried to unset default
            {
                // Unsetting default directly is typically not allowed without setting another one, 
                // but we will keep it simple and just sync legacy.
                await SyncLegacyUserRefundQrAsync(existingUser);
            }

            return ServiceResult<RefundQrItemResponse>.Success(MapRefundQrItemResponse(item));
        }

        public async Task<ServiceResult<bool>> SetDefaultMyRefundQrItemAsync(string userId, int id)
        {
            var existingUser = await _userRepository.GetByIdAsync(userId);
            if (existingUser == null)
                return ServiceResult<bool>.Error("User not found");

            var item = await _refundQrRepository.GetByIdAsync(id);
            if (item == null || item.UserId != userId)
                return ServiceResult<bool>.Error("Không tìm thấy mã QR này.");

            item.IsDefault = true;
            item.UpdatedAt = DateTime.Now;
            await _refundQrRepository.UpdateAsync(item);

            await _refundQrRepository.ClearDefaultsExceptAsync(userId, item.Id);
            await SyncLegacyUserRefundQrAsync(existingUser);

            return ServiceResult<bool>.Success(true);
        }

        public async Task<ServiceResult<bool>> DeleteMyRefundQrItemAsync(string userId, int id)
        {
            var existingUser = await _userRepository.GetByIdAsync(userId);
            if (existingUser == null)
                return ServiceResult<bool>.Error("User not found");

            var item = await _refundQrRepository.GetByIdAsync(id);
            if (item == null || item.UserId != userId)
                return ServiceResult<bool>.Error("Không tìm thấy mã QR này.");

            await _refundQrRepository.DeleteAsync(item);

            var existingItems = await GetRefundQrItemsAsync(userId);
            var remainingItems = existingItems.Where(x => x.Id != id).ToList();

            if (item.IsDefault && remainingItems.Any())
            {
                var oldest = remainingItems.OrderBy(x => x.CreatedAt).First();
                oldest.IsDefault = true;
                oldest.UpdatedAt = DateTime.Now;
                await _refundQrRepository.UpdateAsync(oldest);
            }

            await SyncLegacyUserRefundQrAsync(existingUser);

            return ServiceResult<bool>.Success(true);
        }

        // Helper methods

        private static string? NormalizeRefundQrImageUrl(string? value)
        {
            if (value == null) return null;
            var text = value.Trim();
            return text.Length == 0 ? null : text;
        }

        private async Task EnsureRefundQrSeedFromLegacyAsync(User user)
        {
            if (user == null || string.IsNullOrWhiteSpace(user.Id)) return;
            if (string.IsNullOrWhiteSpace(user.RefundQrImageUrl)) return;

            var hasAny = await _refundQrRepository.HasAnyForUserAsync(user.Id);
            if (hasAny) return;

            await _refundQrRepository.AddAsync(new UserRefundQr
            {
                UserId = user.Id,
                DisplayName = "Tài khoản mặc định",
                QrImageUrl = user.RefundQrImageUrl.Trim(),
                IsDefault = true,
                CreatedAt = DateTime.Now
            });
        }

        private async Task<List<UserRefundQr>> GetRefundQrItemsAsync(string userId)
        {
            return await _refundQrRepository.GetByUserIdAsync(userId);
        }

        private async Task SyncLegacyUserRefundQrAsync(User user)
        {
            var items = await GetRefundQrItemsAsync(user.Id);
            var defaultItem = items.FirstOrDefault(x => x.IsDefault) ?? items.FirstOrDefault();
            var nextLegacyValue = defaultItem?.QrImageUrl;

            if (user.RefundQrImageUrl == nextLegacyValue) return;

            user.RefundQrImageUrl = nextLegacyValue;
            await _userRepository.UpdateAsync(user);
        }

        private async Task<UserResponse> BuildUserResponseAsync(User user, bool includeRefundQrItems)
        {
            var response = new UserResponse
            {
                Id = user.Id,
                Username = user.UserName,
                Name = user.Name,
                Email = user.Email,
                Phone = user.Phone,
                Position = user.Position,
                RefundQrImageUrl = user.RefundQrImageUrl,
                IsActive = user.IsActive,
                UserType = user.UserType,
                Created = user.Created,
                RefundQrItems = null
            };

            var items = await GetRefundQrItemsAsync(user.Id);
            var defaultItem = items.FirstOrDefault(x => x.IsDefault) ?? items.FirstOrDefault();
            response.RefundQrImageUrl = defaultItem?.QrImageUrl;

            if (includeRefundQrItems)
            {
                response.RefundQrItems = items.Select(MapRefundQrItemResponse).ToList();
            }

            return response;
        }

        private static RefundQrItemResponse MapRefundQrItemResponse(UserRefundQr item)
        {
            return new RefundQrItemResponse
            {
                Id = item.Id,
                DisplayName = item.DisplayName,
                QrImageUrl = item.QrImageUrl,
                IsDefault = item.IsDefault,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            };
        }
    }
}
