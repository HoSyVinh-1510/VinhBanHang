using BaseCore.DTO;
using BaseCore.Entities;
using BaseCore.Repository.EFCore;
using BaseCore.Services.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace BaseCore.Services
{
    public class CartService : ICartService
    {
        private readonly ICartItemRepositoryEF _cartRepository;
        private readonly IProductRepositoryEF _productRepository;
        private readonly ICategoryRepositoryEF _categoryRepository;

        public CartService(
            ICartItemRepositoryEF cartRepository,
            IProductRepositoryEF productRepository,
            ICategoryRepositoryEF categoryRepository)
        {
            _cartRepository = cartRepository;
            _productRepository = productRepository;
            _categoryRepository = categoryRepository;
        }

        public async Task<ServiceResult<List<CartItem>>> GetMyCartAsync(string userId)
        {
            var items = await _cartRepository.GetByUserAsync(userId);
            return ServiceResult<List<CartItem>>.Success(items);
        }

        public async Task<ServiceResult<CartItem>> SetQuantityAsync(string userId, SetCartQuantityDto dto)
        {
            if (dto.Quantity <= 0)
                return ServiceResult<CartItem>.Error("Quantity must be greater than 0");

            var product = await _productRepository.GetByIdAsync(dto.ProductId);
            if (product == null || !product.IsActive)
                return ServiceResult<CartItem>.Error("Product not found or inactive");

            var category = await _categoryRepository.GetByIdAsync(product.CategoryId);
            if (category == null || !category.IsActive)
                return ServiceResult<CartItem>.Error("Product category is inactive");

            if (product.Stock < dto.Quantity)
                return ServiceResult<CartItem>.Error("Insufficient stock (Kho không đủ sản phẩm)");

            var item = await _cartRepository.SetQuantityAsync(userId, dto.ProductId, dto.Quantity);
            return ServiceResult<CartItem>.Success(item);
        }

        public async Task<ServiceResult<bool>> RemoveAsync(string userId, int productId)
        {
            await _cartRepository.RemoveAsync(userId, productId);
            return ServiceResult<bool>.Success(true, "Removed");
        }

        public async Task<ServiceResult<bool>> ClearAsync(string userId)
        {
            await _cartRepository.ClearAsync(userId);
            return ServiceResult<bool>.Success(true, "Cleared");
        }
    }
}
