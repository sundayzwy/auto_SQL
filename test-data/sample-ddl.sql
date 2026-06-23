-- ============================================================
-- AutoSQL 测试 DDL 数据集（表元数据导入）
-- 用于测试 DDL 解析器和元数据驱动规则
-- ============================================================

-- 表1: 员工表（Impala）
CREATE TABLE IF NOT EXISTS employees (
    id BIGINT NOT NULL,
    name STRING,
    dept_id INT,
    salary DECIMAL(10, 2),
    status STRING,
    hire_date DATE,
    created_at TIMESTAMP
)
PARTITIONED BY (dept_id)
STORED AS PARQUET;

-- 表2: 部门表
CREATE TABLE departments (
    id INT NOT NULL,
    dept_name STRING,
    location STRING,
    manager_id BIGINT
)
STORED AS PARQUET;

-- 表3: 订单表（Impala 分区表）
CREATE TABLE orders (
    order_id BIGINT NOT NULL,
    customer_id BIGINT,
    order_date DATE,
    status STRING,
    total_amount DECIMAL(12, 2)
)
PARTITIONED BY (order_date, status)
STORED AS ORC;

-- 表4: 订单明细表
CREATE TABLE order_items (
    id BIGINT NOT NULL,
    order_id BIGINT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10, 2)
)
STORED AS PARQUET;

-- 表5: 产品表
CREATE TABLE products (
    id INT NOT NULL,
    product_name STRING,
    category STRING,
    price DECIMAL(10, 2),
    stock_quantity INT
)
STORED AS PARQUET;

-- 表6: 客户表
CREATE TABLE customers (
    id INT NOT NULL,
    customer_name STRING,
    email STRING,
    phone STRING,
    status STRING,
    registered_at TIMESTAMP
)
STORED AS PARQUET;

-- 表7: 销售事实表（Impala 大表，带分区）
CREATE TABLE sales_fact (
    sale_id BIGINT NOT NULL,
    product_id INT,
    store_id INT,
    customer_id BIGINT,
    amount DECIMAL(12, 2),
    quantity INT,
    sale_timestamp TIMESTAMP
)
PARTITIONED BY (store_id, sale_timestamp)
STORED AS PARQUET;

-- 表8: 大表（用于测试 COUNT DISTINCT 等场景）
CREATE TABLE large_table (
    id BIGINT NOT NULL,
    col1 STRING,
    col2 STRING,
    col3 INT,
    data STRING
)
STORED AS PARQUET;