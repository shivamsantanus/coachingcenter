namespace ClassNovaApi.Models
{
    public class NavigationItem
    {
        public string Key { get; set; } = string.Empty;
        public string Label { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string RoutePath { get; set; } = string.Empty;
        public int SortOrder { get; set; }
        public bool IsAdminOnly { get; set; }
        public bool IsLocked { get; set; }
    }
}
