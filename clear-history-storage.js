/**
 * 清理本地存储的历史记录脚本
 * 
 * 由于我们更新了HistoryRecord接口以支持音效识别数据，
 * 旧的历史记录可能会导致显示问题。
 * 
 * 在浏览器控制台中运行此脚本可以清除旧的历史记录。
 */

// 清除历史记录的函数
function clearDescribeMusicHistory() {
    try {
        // 获取当前的历史记录
        const currentHistory = localStorage.getItem('describe_music_history');

        console.log('🔍 当前历史记录状态:');
        if (currentHistory) {
            const records = JSON.parse(currentHistory);
            console.log(`   找到 ${records.length} 条历史记录`);

            // 检查是否有音效数据
            const hasAudioEffects = records.some(record => record.contentType || record.soundEffects);
            console.log(`   包含音效数据: ${hasAudioEffects ? '是' : '否'}`);

            if (!hasAudioEffects) {
                console.log('⚠️  检测到旧格式的历史记录，建议清除');
            }
        } else {
            console.log('   没有找到历史记录');
        }

        // 清除历史记录
        localStorage.removeItem('describe_music_history');
        console.log('✅ 历史记录已清除');

        // 清除其他相关缓存
        const keysToCheck = [
            'describe_music_cache',
            'describe_music_settings',
            'audio_analysis_cache'
        ];

        keysToCheck.forEach(key => {
            if (localStorage.getItem(key)) {
                localStorage.removeItem(key);
                console.log(`✅ 已清除: ${key}`);
            }
        });

        console.log('🎉 清理完成！现在可以重新分析音频文件了');
        console.log('💡 建议硬刷新页面 (Ctrl+Shift+R 或 Cmd+Shift+R)');

    } catch (error) {
        console.error('❌ 清理过程中出错:', error);
    }
}

// 检查历史记录格式的函数
function checkHistoryFormat() {
    try {
        const currentHistory = localStorage.getItem('describe_music_history');

        if (!currentHistory) {
            console.log('📝 没有历史记录');
            return;
        }

        const records = JSON.parse(currentHistory);
        console.log(`📊 历史记录分析 (${records.length} 条记录):`);

        records.forEach((record, index) => {
            console.log(`\n记录 ${index + 1}: ${record.filename}`);
            console.log(`   内容类型: ${record.contentType ? record.contentType.primary : '❌ 缺失'}`);
            console.log(`   音效数据: ${record.soundEffects ? '✅ 存在' : '❌ 缺失'}`);
            console.log(`   检测到的音效: ${record.soundEffects?.detected?.length || 0} 个`);
        });

        const newFormatCount = records.filter(r => r.contentType || r.soundEffects).length;
        console.log(`\n📈 新格式记录: ${newFormatCount}/${records.length}`);

        if (newFormatCount < records.length) {
            console.log('⚠️  建议运行 clearDescribeMusicHistory() 清除旧记录');
        }

    } catch (error) {
        console.error('❌ 检查过程中出错:', error);
    }
}

// 导出函数
if (typeof window !== 'undefined') {
    window.clearDescribeMusicHistory = clearDescribeMusicHistory;
    window.checkHistoryFormat = checkHistoryFormat;

    console.log('🛠️  历史记录管理工具已加载');
    console.log('📝 可用命令:');
    console.log('   checkHistoryFormat() - 检查历史记录格式');
    console.log('   clearDescribeMusicHistory() - 清除所有历史记录');
} else {
    // Node.js 环境
    module.exports = {
        clearDescribeMusicHistory,
        checkHistoryFormat
    };
}

// 如果直接运行此脚本，执行检查
if (typeof window !== 'undefined') {
    console.log('🔍 自动检查历史记录格式...');
    checkHistoryFormat();
}