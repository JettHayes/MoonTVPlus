/**
 * 采集源分类的层级工具：苹果CMS V10 的 class 列表带 type_pid，
 * 一级分类 pid 为 '0'，二级分类指向父分类 id；部分源只返回平铺列表。
 */

export interface CategoryNode {
  id: string;
  name: string;
  pid?: string;
}

// 分类列表是否为「类型 → 分类」两级结构
export function isHierarchicalCategories(list: CategoryNode[]): boolean {
  const ids = new Set(list.map((item) => item.id));
  return list.some(
    (item) => item.pid && item.pid !== '0' && ids.has(item.pid)
  );
}

// 一级分类列表；孤儿分类（pid 指向不存在的分类）视为一级
export function getParentCategories(list: CategoryNode[]): CategoryNode[] {
  const ids = new Set(list.map((item) => item.id));
  return list.filter(
    (item) => !item.pid || item.pid === '0' || !ids.has(item.pid)
  );
}

// 指定一级分类下的子分类
export function getChildCategories(
  list: CategoryNode[],
  parentId: string
): CategoryNode[] {
  return list.filter((item) => item.pid === parentId);
}

// 列表的默认选择：两级结构时选中第一个类型下的第一个子分类，
// 类型下没有子分类时用类型自身；平铺结构取第一个分类
export function pickDefaultSelection(list: CategoryNode[]): {
  parent: string;
  category: string;
} {
  if (list.length === 0) return { parent: '', category: '' };
  if (!isHierarchicalCategories(list)) {
    return { parent: '', category: list[0].id };
  }
  const firstParent = getParentCategories(list)[0];
  const children = getChildCategories(list, firstParent.id);
  return {
    parent: firstParent.id,
    category: children.length > 0 ? children[0].id : firstParent.id,
  };
}
