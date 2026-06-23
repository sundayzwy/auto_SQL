-- ============================================================
-- AutoSQL 测试 SQL 数据集
-- 包含多种 SQL 方言和常见优化场景，用于测试引擎功能
-- ============================================================

-- 场景1: SELECT * 反模式 (触发 R001)
SELECT * FROM employees WHERE department = 'Engineering';

-- 场景2: 笛卡尔积 (触发 R002)
SELECT e.name, d.dept_name FROM employees e, departments d;

-- 场景3: WHERE 子查询可改写为 JOIN (触发 R003)
SELECT name FROM employees WHERE dept_id IN (SELECT id FROM departments WHERE location = 'Beijing');

-- 场景4: WHERE 中对字段使用函数 (触发 R004)
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- 场景5: LIKE 前导通配符 (触发 R005)
SELECT * FROM products WHERE product_name LIKE '%laptop%';

-- 场景6: UNION 可改为 UNION ALL (触发 R006)
SELECT name FROM employees_2023 UNION SELECT name FROM employees_2024;

-- 场景7: 隐式类型转换 (触发 R007)
SELECT * FROM users WHERE age = '25';

-- 场景8: IN 子查询可改为 EXISTS (触发 R008)
SELECT * FROM orders o WHERE o.customer_id IN (SELECT c.id FROM customers c WHERE c.status = 'ACTIVE');

-- 场景9: 正常查询 (应无问题)
SELECT e.id, e.name, e.salary, d.dept_name
FROM employees e
JOIN departments d ON e.dept_id = d.id
WHERE e.salary > 50000
  AND e.status = 'ACTIVE'
ORDER BY e.salary DESC;

-- 场景10: 复杂多表 JOIN
SELECT 
    o.order_id,
    c.customer_name,
    p.product_name,
    oi.quantity,
    oi.unit_price,
    (oi.quantity * oi.unit_price) AS total_amount
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-07-01'
  AND o.status = 'COMPLETED'
GROUP BY o.order_id, c.customer_name, p.product_name, oi.quantity, oi.unit_price
HAVING SUM(oi.quantity * oi.unit_price) > 1000
ORDER BY total_amount DESC
LIMIT 100;

-- 场景11: Impala 分区表查询 (需配合元数据使用，触发 I001)
SELECT * FROM sales_fact WHERE amount > 10000;

-- 场景12: COUNT(DISTINCT) 多列 (触发 I005)
SELECT COUNT(DISTINCT col1, col2) FROM large_table;

-- 场景13: Oracle 分页查询 (触发 O003)
SELECT * FROM (
    SELECT a.*, ROWNUM rn FROM (
        SELECT * FROM employees ORDER BY salary DESC
    ) a WHERE ROWNUM <= 20
) WHERE rn > 10;

-- 场景14: OR 条件可能导致全表扫描 (触发 O004)
SELECT * FROM employees WHERE department = 'Sales' OR salary > 100000;

-- 场景15: INSERT INTO SELECT
INSERT INTO employees_backup
SELECT * FROM employees WHERE status = 'ACTIVE';

-- 场景16: 子查询作为表
SELECT sub.dept, sub.avg_salary
FROM (
    SELECT dept_id AS dept, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY dept_id
) sub
WHERE sub.avg_salary > 60000;

-- 场景17: CASE WHEN 表达式
SELECT 
    name,
    salary,
    CASE 
        WHEN salary < 30000 THEN 'Low'
        WHEN salary < 60000 THEN 'Medium'
        WHEN salary < 100000 THEN 'High'
        ELSE 'Premium'
    END AS salary_level
FROM employees;

-- 场景18: 窗口函数
SELECT 
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rank_in_dept,
    AVG(salary) OVER (PARTITION BY department) AS avg_dept_salary
FROM employees;