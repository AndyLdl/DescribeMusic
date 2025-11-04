-- 分析结果表
-- 用于存储完整的分析结果，支持分享功能
-- 任何人都可以通过 analysis_id 访问（公开访问）

CREATE TABLE IF NOT EXISTS analysis_results (
  id TEXT PRIMARY KEY,  -- 使用现有的 analysis_id（UUID 格式字符串）
  user_id UUID REFERENCES auth.users(id) NULL,  -- 创建者ID（可选，用于统计）
  result_data JSONB NOT NULL,  -- 完整分析结果数据（包含所有字段和音频URL）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,  -- 过期时间（可选，用于清理旧数据）
  is_public BOOLEAN DEFAULT true  -- 是否公开（默认公开，未来可扩展为私有）
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_analysis_results_user_id ON analysis_results(user_id);
CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON analysis_results(created_at);
CREATE INDEX IF NOT EXISTS idx_analysis_results_expires_at ON analysis_results(expires_at);

-- 创建索引用于 JSONB 查询（如果需要）
CREATE INDEX IF NOT EXISTS idx_analysis_results_result_data ON analysis_results USING gin(result_data);

-- 启用行级安全（RLS）
ALTER TABLE analysis_results ENABLE ROW LEVEL SECURITY;

-- 创建公开访问策略（任何人都可以读取）
CREATE POLICY "Anyone can read analysis results"
  ON analysis_results
  FOR SELECT
  USING (true);

-- 创建插入策略（只有认证用户可以插入，但也可以允许匿名用户）
-- 这里允许任何人插入，因为我们需要支持未登录用户的分析结果分享
CREATE POLICY "Anyone can insert analysis results"
  ON analysis_results
  FOR INSERT
  WITH CHECK (true);

-- 创建更新策略（只有创建者可以更新）
CREATE POLICY "Users can update their own analysis results"
  ON analysis_results
  FOR UPDATE
  USING (
    -- 允许创建者更新，或者 user_id 为 NULL 时允许更新（匿名用户）
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- 创建删除策略（只有创建者可以删除）
CREATE POLICY "Users can delete their own analysis results"
  ON analysis_results
  FOR DELETE
  USING (
    -- 允许创建者删除，或者 user_id 为 NULL 时允许删除（匿名用户）
    (auth.uid() = user_id) OR (user_id IS NULL)
  );

-- 创建清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_expired_analysis_results()
RETURNS void AS $$
BEGIN
  DELETE FROM analysis_results
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 注释说明
COMMENT ON TABLE analysis_results IS '存储完整的音频分析结果，支持通过链接分享给其他用户';
COMMENT ON COLUMN analysis_results.id IS '分析结果ID（与 analysis_id 对应）';
COMMENT ON COLUMN analysis_results.user_id IS '创建者用户ID（可选，用于统计）';
COMMENT ON COLUMN analysis_results.result_data IS '完整的分析结果JSON数据，包含所有分析字段和音频URL';
COMMENT ON COLUMN analysis_results.expires_at IS '过期时间，过期后可以自动清理';
COMMENT ON COLUMN analysis_results.is_public IS '是否公开，默认true（所有人都可以访问）';

