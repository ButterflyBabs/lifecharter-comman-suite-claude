export type LayoutMode = "grid" | "list";

export type DashboardLayout = {
  layoutMode: LayoutMode;
  widgetOrder: string[];
  hiddenWidgets: string[];
};

export type WidgetDefinition = {
  key: string;
  title: string;
};
