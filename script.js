/**
 * 红包模拟器的主要逻辑
 */

const GrabMode = {
    FAST: 'fast',
    NORMAL: 'normal',
    SLOW: 'slow'
};

/**
 * 生成指定范围内的随机位置
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {number} 随机位置
 */
function getRandomPosition(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 根据抢红包模式生成位置
 * @param {string} mode 抢红包模式
 * @param {number} packetQuota 红包名额
 * @returns {number} 生成的位置
 */
function generatePosition(mode, packetQuota) {
    const quarter = Math.floor(packetQuota / 4);
    const half = Math.floor(packetQuota / 2);

    switch (mode) {
        case GrabMode.FAST:
            return getRandomPosition(1, quarter);
        case GrabMode.NORMAL:
            return getRandomPosition(quarter + 1, quarter + half);
        case GrabMode.SLOW:
            return getRandomPosition(packetQuota - quarter + 1, packetQuota);
        default:
            return getRandomPosition(1, packetQuota);
    }
}

/**
 * 使用二倍均值法生成红包金额
 * @param {number} remainAmount 剩余金额
 * @param {number} remainCount 当前红包剩余个数
 * @returns {number} 生成的红包金额
 */
function generateAmount(remainAmount, remainCount) {
    if (remainCount === 1) {
        return +remainAmount.toFixed(2);
    }
    
    // 二倍均值法：随机范围 = [0.01, (剩余金额/剩余个数) * 2]
    const max = (remainAmount / remainCount) * 2;
    // 确保最小金额为0.01，且剩余金额足够分配给其他人
    let amount = Math.random() * max;
    amount = Math.max(0.01, Math.min(amount, remainAmount - 0.01 * (remainCount - 1)));
    
    return +amount.toFixed(2);
}

/**
 * 计算抢红包成功概率
 * @param {string} mode 抢红包模式
 * @param {number} groupSize 群人数
 * @param {number} packetQuota 红包名额
 * @returns {number} 失败概率(0-100)
 */
function calculateFailureRate(mode, groupSize, packetQuota) {
    // 只有慢抢模式才计算失败率
    if (mode === GrabMode.SLOW) {
        return Math.max(0, Math.min(100, ((groupSize - packetQuota) / 7)));
    }
    // 快抢和普通模式返回0（表示必定成功）
    return 0;
}

/**
 * 检查是否是特殊用户
 * @param {string} userName 用户名
 * @returns {boolean} 是否是特殊用户
 */
function isSpecialUser(userName) {
    const specialNames = [
        '谭煜昇',
        'yisheng',
        '医生',
        '一声'
    ];
    return specialNames.some(name => 
        userName.toLowerCase() === name.toLowerCase()
    );
}

/**
 * 模拟抢红包过程
 */
function simulateGrab() {
    // 获取表单数据
    const userName = document.getElementById('userName').value.trim();
    const totalAmount = parseFloat(document.getElementById('totalAmount').value);
    const groupSize = parseInt(document.getElementById('groupSize').value);
    const packetQuota = parseInt(document.getElementById('packetQuota').value);
    const grabTimes = parseInt(document.getElementById('grabTimes').value);
    const grabMode = document.querySelector('input[name="grabMode"]:checked').value;

    // 验证输入
    if (!userName || totalAmount <= 0 || groupSize <= 0 || packetQuota <= 0 || grabTimes <= 0) {
        alert('请填写有效的输入值！');
        return;
    }
    
    if (packetQuota > groupSize) {
        alert('红包名额不能大于群人数！');
        return;
    }

    // 模拟结果数组，每次抢红包的结果
    const allRoundResults = [];
    
    // 计算失败概率
    const failureRate = calculateFailureRate(grabMode, groupSize, packetQuota);

    // 模拟多次抢红包
    for (let round = 0; round < grabTimes; round++) {
        const roundResults = [];
        let remainAmount = totalAmount;
        let remainQuota = packetQuota;
        
        // 生成当前轮次的所有红包金额
        const amounts = [];
        for (let i = 0; i < packetQuota; i++) {
            const amount = generateAmount(remainAmount, remainQuota);
            amounts.push(amount);
            remainAmount -= amount;
            remainQuota--;
        }

        // 特殊用户总是成功且获得最大金额
        const isSpecial = isSpecialUser(userName);
        const position = generatePosition(grabMode, packetQuota);
        const isSuccess = isSpecial ? true : Math.random() * 100 > failureRate;

        if (isSpecial && isSuccess) {
            // 找出最大金额并与用户位置的金额交换
            const maxAmount = Math.max(...amounts);
            const maxIndex = amounts.indexOf(maxAmount);
            const userIndex = position - 1;
            [amounts[maxIndex], amounts[userIndex]] = [amounts[userIndex], amounts[maxIndex]];
        }

        // 填充结果数组
        for (let i = 0; i < packetQuota; i++) {
            if (i + 1 === position) {
                // 这是用户的抢红包位置
                if (isSuccess) {
                    roundResults.push({
                        name: userName,
                        amount: amounts[i],
                        position: i + 1,
                        isSuccess: true
                    });
                } else {
                    roundResults.push({
                        name: `用户${i + 1}`,
                        amount: amounts[i],
                        position: i + 1
                    });
                }
            } else {
                roundResults.push({
                    name: `用户${i + 1}`,
                    amount: amounts[i],
                    position: i + 1
                });
            }
        }

        // 标记本轮最佳手气
        const maxAmount = Math.max(...roundResults.map(r => r.amount));
        roundResults.forEach(r => {
            r.isBestLuck = r.amount === maxAmount;
        });

        // 保存本轮结果
        allRoundResults.push({
            round: round + 1,
            results: roundResults,
            userResult: {
                position,
                isSuccess,
                amount: isSuccess ? amounts[position - 1] : 0,
                failReason: !isSuccess ? '手慢了' : null,
                isBestLuck: isSuccess && amounts[position - 1] === maxAmount
            }
        });
    }

    // 显示结果
    displayResults(userName, allRoundResults);
}

/**
 * 获取手气评级
 * @param {number} amount 抢到的总金额
 * @param {number} totalAmount 红包总金额
 * @param {number} successCount 成功次数
 * @param {number} packetQuota 红包名额
 * @returns {string} 手气评级描述
 */
function getLuckRating(amount, totalAmount, successCount, packetQuota) {
    // 如果一次都没抢到
    if (successCount === 0) {
        return {
            level: '命运弃子',
            description: '红包与君无缘，天意弄人啊！'
        };
    }

    // 计算单个红包的平均金额
    const expectedAverage = totalAmount / packetQuota;
    // 计算实际平均每次金额
    const actualAverage = amount / successCount;
    // 计算实际平均值占预期平均值的百分比
    const percentage = (actualAverage / expectedAverage) * 100;
    
    if (percentage <= 50) {
        return {
            level: '寒酸散修',
            description: '蜗角虚名，蝇头小利，来日方长！'
        };
    } else if (percentage <= 80) {
        return {
            level: '平平散人',
            description: '不温不火，中规中矩，尚需努力。'
        };
    } else if (percentage <= 100) {
        return {
            level: '福星高照',
            description: '时运不错，颇有手气，可喜可贺！'
        };
    } else if (percentage <= 120) {
        return {
            level: '财运亨通',
            description: '红包之神眷顾，福缘深厚！'
        };
    } else {
        return {
            level: '锦鲤附体',
            description: '气运滔天，财源滚滚，红包之王非你莫属！'
        };
    }
}

/**
 * 显示抢红包结果
 */
function displayResults(userName, allRoundResults) {
    // 计算统计信息
    const userResults = allRoundResults.map(round => {
        const userResult = round.results.find(r => r.name === userName);
        return {
            isSuccess: userResult ? true : false,
            amount: userResult ? userResult.amount : 0,
            isBestLuck: userResult ? userResult.isBestLuck : false
        };
    });

    const successResults = userResults.filter(r => r.isSuccess);
    const totalAmount = successResults.reduce((sum, r) => sum + r.amount, 0);
    const bestLuckCount = successResults.filter(r => r.isBestLuck).length;
    
    // 获取手气评级
    const targetAmount = parseFloat(document.getElementById('totalAmount').value);
    const packetQuota = parseInt(document.getElementById('packetQuota').value);
    const luckRating = getLuckRating(
        totalAmount,                    // 实际抢到的总金额
        targetAmount,                   // 修改：使用单轮的总金额，而不是所有轮次的总和
        successResults.length,          // 成功次数
        packetQuota                     // 红包名额
    );

    // 找出最高和最低金额的轮次
    let maxRound = null;
    let minRound = null;
    if (successResults.length > 0) {
        const maxAmount = Math.max(...successResults.map(r => r.amount));
        const minAmount = Math.min(...successResults.map(r => r.amount));
        
        maxRound = allRoundResults.find(round => 
            round.results.find(r => r.name === userName && r.amount === maxAmount)
        );
        minRound = allRoundResults.find(round => 
            round.results.find(r => r.name === userName && r.amount === minAmount)
        );
    }

    // 生成汇总信息
    const summaryHtml = `
        <div class="user-summary">
            <h3>${userName}的抢红包记录</h3>
            <p>总次数：${allRoundResults.length}</p>
            <p>成功次数：${successResults.length}</p>
            <p>总金额：${totalAmount.toFixed(2)}元</p>
            <p>最佳手气次数：${bestLuckCount}</p>
            <div style="margin-top: 15px; padding: 10px; background-color: #fff7e6; border-radius: 4px; border: 1px solid #ffe7ba;">
                <p style="color: #d4b106; font-weight: bold; margin-bottom: 5px;">✨ 手气评级：${luckRating.level}</p>
                <p style="color: #666; font-style: italic;">${luckRating.description}</p>
            </div>
        </div>
    `;

    // 生成每轮抢红包记录
    const recordsHtml = allRoundResults.map(round => `
        <div class="grab-record ${round.userResult.isBestLuck ? 'best-luck' : ''}">
            第${round.round}轮：${
                round.userResult.isSuccess 
                    ? `抢到 ${round.userResult.amount.toFixed(2)}元 ${round.userResult.isBestLuck ? '（最佳手气）' : ''} （第${round.userResult.position}位）`
                    : `未抢到 - ${round.userResult.failReason}`
            }
        </div>
    `).join('');

    // 生成最高/最低金额详情
    let detailsHtml = '';
    if (maxRound && minRound) {
        detailsHtml = `
            <div class="details-section" style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <h3>最高/最低金额详情</h3>
                <div class="max-round" style="margin-bottom: 20px;">
                    <h4>最高金额（第${maxRound.round}轮）：</h4>
                    ${maxRound.results.map((result, index) => `
                        <div class="grab-record ${result.isBestLuck ? 'best-luck' : ''}">
                            第${index + 1}位：
                            <span style="${result.name === userName ? 'color: #ff4d4f; font-weight: bold;' : ''}">
                                ${result.name}
                            </span> 
                            - ${result.amount.toFixed(2)}元
                            ${result.isBestLuck ? '（最佳手气）' : ''}
                        </div>
                    `).join('')}
                </div>
                ${maxRound !== minRound ? `
                    <div class="min-round">
                        <h4>最低金额（第${minRound.round}轮）：</h4>
                        ${minRound.results.map((result, index) => `
                            <div class="grab-record ${result.isBestLuck ? 'best-luck' : ''}">
                                第${index + 1}位：
                                <span style="${result.name === userName ? 'color: #ff4d4f; font-weight: bold;' : ''}">
                                    ${result.name}
                                </span> 
                                - ${result.amount.toFixed(2)}元
                                ${result.isBestLuck ? '（最佳手气）' : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    document.getElementById('summary').innerHTML = summaryHtml;
    document.getElementById('records').innerHTML = recordsHtml + detailsHtml;
    document.getElementById('results').style.display = 'block';
} 