using System.Collections.Generic;

namespace BaseCore.DTO
{
    public class RoleDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string Description { get; set; } = "";
        public int UserType { get; set; }
    }

    public class RolePermissionsDto
    {
        public string Role { get; set; } = "";
        public IEnumerable<string> Permissions { get; set; } = new List<string>();
    }
}
