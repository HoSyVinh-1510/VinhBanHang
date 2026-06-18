using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class CustomerAddressService : ICustomerAddressService
    {
        private readonly ICustomerAddressRepositoryEF _addressRepository;

        public CustomerAddressService(ICustomerAddressRepositoryEF addressRepository)
        {
            _addressRepository = addressRepository;
        }

        public async Task<ServiceResult<List<CustomerAddress>>> GetMyAddressesAsync(string userId)
        {
            var addresses = await _addressRepository.GetByUserAsync(userId);
            return ServiceResult<List<CustomerAddress>>.Success(addresses);
        }

        public async Task<ServiceResult<CustomerAddress>> CreateAsync(string userId, AddressDto dto)
        {
            var validation = ValidateAddress(dto);
            if (validation != null)
                return ServiceResult<CustomerAddress>.Error(validation);

            var hasAddress = await _addressRepository.ExistsByUserAsync(userId);
            var makeDefault = dto.IsDefault || !hasAddress;
            if (makeDefault)
            {
                await _addressRepository.ClearDefaultAsync(userId);
            }

            var address = new CustomerAddress
            {
                UserId = userId,
                ReceiverName = dto.ReceiverName.Trim(),
                Phone = dto.Phone.Trim(),
                AddressLine = dto.AddressLine.Trim(),
                Ward = NormalizeNullable(dto.Ward),
                District = NormalizeNullable(dto.District),
                Province = NormalizeNullable(dto.Province),
                IsDefault = makeDefault,
                CreatedAt = DateTime.UtcNow
            };

            await _addressRepository.AddAsync(address);
            return ServiceResult<CustomerAddress>.Success(address);
        }

        public async Task<ServiceResult<CustomerAddress>> UpdateAsync(string userId, int id, AddressDto dto)
        {
            var validation = ValidateAddress(dto);
            if (validation != null)
                return ServiceResult<CustomerAddress>.Error(validation);

            var address = await _addressRepository.GetByUserAndIdAsync(userId, id);
            if (address == null)
                return ServiceResult<CustomerAddress>.Error("Address not found");

            if (dto.IsDefault)
            {
                await _addressRepository.ClearDefaultAsync(userId);
            }

            address.ReceiverName = dto.ReceiverName.Trim();
            address.Phone = dto.Phone.Trim();
            address.AddressLine = dto.AddressLine.Trim();
            address.Ward = NormalizeNullable(dto.Ward);
            address.District = NormalizeNullable(dto.District);
            address.Province = NormalizeNullable(dto.Province);
            address.IsDefault = dto.IsDefault || address.IsDefault;
            address.UpdatedAt = DateTime.UtcNow;

            await _addressRepository.UpdateAsync(address);
            return ServiceResult<CustomerAddress>.Success(address);
        }

        public async Task<ServiceResult<CustomerAddress>> SetDefaultAsync(string userId, int id)
        {
            var address = await _addressRepository.GetByUserAndIdAsync(userId, id);
            if (address == null)
                return ServiceResult<CustomerAddress>.Error("Address not found");

            await _addressRepository.ClearDefaultAsync(userId);
            address.IsDefault = true;
            address.UpdatedAt = DateTime.UtcNow;
            await _addressRepository.UpdateAsync(address);
            return ServiceResult<CustomerAddress>.Success(address);
        }

        public async Task<ServiceResult<bool>> DeleteAsync(string userId, int id)
        {
            var address = await _addressRepository.GetByUserAndIdAsync(userId, id);
            if (address == null)
                return ServiceResult<bool>.Error("Address not found");

            var wasDefault = address.IsDefault;
            await _addressRepository.DeleteAsync(address);

            if (wasDefault)
            {
                var nextDefault = await _addressRepository.GetLatestByUserAsync(userId);
                if (nextDefault != null)
                {
                    nextDefault.IsDefault = true;
                    nextDefault.UpdatedAt = DateTime.UtcNow;
                    await _addressRepository.UpdateAsync(nextDefault);
                }
            }

            return ServiceResult<bool>.Success(true, "Address deleted");
        }

        private static string? ValidateAddress(AddressDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ReceiverName))
                return "Receiver name is required.";
            if (string.IsNullOrWhiteSpace(dto.Phone))
                return "Phone is required.";
            if (string.IsNullOrWhiteSpace(dto.AddressLine))
                return "Address is required.";
            return null;
        }

        private static string? NormalizeNullable(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }
}
