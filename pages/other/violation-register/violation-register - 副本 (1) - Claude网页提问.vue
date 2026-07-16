<template>
	<view class="container">
		<!-- 说明卡片 -->
		<uni-card class="card" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<text class="uni-card-txt">违规注册检测 - 检测相同IP地址注册的用户账号，识别潜在的批量注册行为</text>
		</uni-card>

		<!-- 查询条件区域 -->
		<uni-card :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<view class="query-section">
				<text class="section-title">查询条件</text>
				
				<!-- 时间范围显示 -->
				<uni-forms-item label="查询时间范围" :label-width="120">
					<uni-datetime-picker 
						v-model="timeRange" 
						type="datetimerange" 
						:disabled="true"
						rangeSeparator="至"
						:clear-icon="false"
						:border="false"
						class="time-picker-display" />
				</uni-forms-item>

				<!-- 快捷时间选择按钮 -->
				<uni-forms-item label="快捷选择" :label-width="120">
					<view class="time-buttons">
						<button 
							v-for="(option, index) in timeOptions" 
							:key="index"
							:class="['time-button', { selected: selectedTimeOption === index }]" 
							@click="selectTimeOption(index)"
							size="mini">
							{{ option.name }}
						</button>
					</view>
				</uni-forms-item>

				<!-- 查询按钮 -->
				<view class="query-actions">
					<button type="primary" @click="queryViolationUsers" :loading="loading">
						{{ loading ? '查询中...' : '开始检测' }}
					</button>
				</view>
			</view>
		</uni-card>

		<!-- 统计信息卡片 -->
		<uni-card v-if="statisticsData.totalViolationUsers > 0" :is-shadow="false" :is-full="false" :border="true" margin="0 0 10px 0">
			<view class="statistics-section">
				<text class="section-title">检测统计</text>
				<view class="statistics-grid">
					<view class="stat-item">
						<text class="stat-number">{{ statisticsData.totalViolationUsers }}</text>
						<text class="stat-label">违规用户总数</text>
					</view>
					<view class="stat-item">
						<text class="stat-number">{{ statisticsData.violationIpCount }}</text>
						<text class="stat-label">违规IP数量</text>
					</view>
					<view class="stat-item">
						<text class="stat-number">{{ statisticsData.suspiciousInviters }}</text>
						<text class="stat-label">可疑邀请人</text>
					</view>
				</view>
			</view>
		</uni-card>

		<!-- 相同IP分组数据 -->
		<view v-if="violationGroups.length > 0">
			<uni-card 
				v-for="(group, groupIndex) in violationGroups" 
				:key="groupIndex"
				:is-shadow="false" 
				:is-full="false" 
				:border="true" 
				margin="0 0 15px 0">
				
				<view class="ip-group-header">
					<view class="ip-info">
						<text class="ip-address">IP: {{ group.ip }}</text>
						<text class="user-count">注册用户数: {{ group.users.length }}</text>
					</view>
					<view class="inviter-info">
						<text class="inviter-label">邀请人信息:</text>
						<view v-if="group.inviterInfo.length > 0">
							<view 
								v-for="(inviter, inviterIndex) in group.inviterInfo" 
								:key="inviterIndex"
								class="inviter-item">
								<text class="inviter-code">邀请码: {{ inviter.inviteCode || '无' }}</text>
								<text class="inviter-count">邀请数量: {{ inviter.count }}</text>
								<text class="risk-level" :class="getRiskLevelClass(inviter.riskLevel)">
									风险等级: {{ inviter.riskLevel }}
								</text>
								<button 
									v-if="inviter.inviteCode && inviter.inviteCode !== '无'" 
									class="ban-inviter-btn" 
									size="mini" 
									type="warn"
									@click="banInviter(inviter.inviteCode, inviter.inviterId)">
									封禁邀请人
								</button>
							</view>
						</view>
						<text v-else class="no-inviter">无邀请人</text>
					</view>
				</view>

				<!-- 用户列表表格 -->
				<uni-table ref="table" :loading="false" border stripe>
					<uni-tr>
						<uni-th width="80" align="center">用户状态</uni-th>
						<uni-th width="100" align="center">邀请码</uni-th>
						<uni-th width="140" align="center">受邀时间</uni-th>
						<uni-th width="140" align="center">最后登录</uni-th>
						<uni-th width="120" align="center">最后登录IP</uni-th>
						<uni-th width="140" align="center">注册时间</uni-th>
						<uni-th width="120" align="center">注册IP</uni-th>
						<uni-th width="140" align="center">操作</uni-th>
					</uni-tr>
					<uni-tr v-for="(user, userIndex) in group.users" :key="userIndex">
						<uni-td align="center">
							<text :class="getStatusClass(user.status)">
								{{ getStatusText(user.status) }}
							</text>
						</uni-td>
						<uni-td align="center">{{ user.inviterInviteCode || '无' }}</uni-td>
						<uni-td align="center">
							{{ user.invite_time ? formatTimestampToDateTime(user.invite_time) : '无' }}
						</uni-td>
						<uni-td align="center">
							{{ formatTimestampToDateTime(user.login_date) }}
						</uni-td>
						<uni-td align="center">{{ user.login_ip }}</uni-td>
						<uni-td align="center">
							{{ formatTimestampToDateTime(user.register_date) }}
						</uni-td>
						<uni-td align="center">{{ user.register_ip }}</uni-td>
						<uni-td align="center">
							<view class="action-buttons">
								<button 
									size="mini" 
									type="warn" 
									@click="banUser(user._id, userIndex, groupIndex)"
									:disabled="user.status === 3">
									{{ user.status === 3 ? '已封禁' : '封禁' }}
								</button>
								<button 
									size="mini" 
									type="primary" 
									@click="editUser(user._id)">
									修改
								</button>
							</view>
						</uni-td>
					</uni-tr>
				</uni-table>
			</uni-card>
		</view>

		<!-- 无数据提示 -->
		<uni-card v-if="hasQueried && violationGroups.length === 0" :is-shadow="false" :is-full="false" :border="true">
			<view class="no-data">
				<text>暂无发现违规注册用户</text>
			</view>
		</uni-card>
	</view>
</template>

<script>
	const db = uniCloud.database();
	const dbCmd = db.command;

	// 用户数据库表
	const userCollectionName = 'user-accounts'
	const userCollection = db.collection(userCollectionName)

	export default {
		data() {
			return {
				loading: false, // 查询加载状态
				hasQueried: false, // 是否已经查询过
				timeRange: [], // 时间范围选择器的值
				selectedTimeOption: 0, // 当前选择的时间选项
				timeOptions: [ // 时间选择选项
					{ name: '今天', days: 0, type: 'today' },
					{ name: '昨天', days: 1, type: 'yesterday' },
					{ name: '前天', days: 2, type: 'dayBefore' },
					{ name: '最近3天', days: 3, type: 'recent' },
					{ name: '最近7天', days: 7, type: 'recent' },
					{ name: '最近15天', days: 15, type: 'recent' },
					{ name: '最近30天', days: 30, type: 'recent' }
				],
				violationGroups: [], // 违规分组数据
				statisticsData: { // 统计数据
					totalViolationUsers: 0, // 违规用户总数
					violationIpCount: 0, // 违规IP数量
					suspiciousInviters: 0 // 可疑邀请人数量
				}
			}
		},
		onLoad() {
			// 页面加载时默认选择今天
			this.selectTimeOption(0);
		},
		methods: {
			/**
			 * 选择时间选项
			 * @param { Number } index - 时间选项的索引
			 */
			selectTimeOption(index) {
				this.selectedTimeOption = index;
				const option = this.timeOptions[index];
				const timeRange = this.calculateTimeRange(option.days, option.type);
				this.timeRange = timeRange;
			},

			/**
			 * 计算时间范围
			 * @param { Number } days - 天数
			 * @param { String } type - 类型 today/yesterday/dayBefore/recent
			 * @return { Array } 时间范围数组
			 */
			calculateTimeRange(days, type) {
				const now = new Date();
				let startTime, endTime;

				if (type === 'today') {
					// 今天：今天0点0分0秒至现在
					startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
					endTime = now;
				} else if (type === 'yesterday') {
					// 昨天：昨天0点0分0秒至现在
					const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
					startTime = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
					endTime = now;
				} else if (type === 'dayBefore') {
					// 前天：前天0点0分0秒至现在
					const dayBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
					startTime = new Date(dayBefore.getFullYear(), dayBefore.getMonth(), dayBefore.getDate(), 0, 0, 0);
					endTime = now;
				} else {
					// 最近N天：N天前的0点0分0秒至现在
					const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
					startTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0);
					endTime = now;
				}

				return [
					this.formatDateTimeToString(startTime),
					this.formatDateTimeToString(endTime)
				];
			},

			/**
			 * 将Date对象格式化为字符串
			 * @param { Date } date - 日期对象
			 * @return { String } 格式化后的日期时间字符串
			 */
			formatDateTimeToString(date) {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				const seconds = String(date.getSeconds()).padStart(2, '0');
				return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
			},

			/**
			 * 将时间戳转换为指定格式的日期时间字符串
			 * @param { Number } timestamp - 时间戳（支持秒和毫秒）
			 * @return { String } 格式化后的日期时间字符串
			 */
			formatTimestampToDateTime(timestamp) {
				if (!timestamp) return '无';
				
				// 判断时间戳是秒还是毫秒
				const isMilliseconds = timestamp.toString().length > 10;
				const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);

				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				const seconds = String(date.getSeconds()).padStart(2, '0');

				return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
			},

			/**
			 * 查询违规注册用户
			 */
			async queryViolationUsers() {
				if (this.timeRange.length !== 2) {
					uni.showToast({
						title: '请选择时间范围',
						icon: 'none'
					});
					return;
				}

				this.loading = true;
				this.hasQueried = false;

				try {
					// 解析时间范围
					const startTime = new Date(this.timeRange[0]).getTime();
					const endTime = new Date(this.timeRange[1]).getTime();

					console.log('查询时间范围:', startTime, 'to', endTime);

					// 查询指定时间范围内的所有用户
					const { result: { data: allUsers } } = await userCollection.where({
						register_date: dbCmd.gte(startTime).and(dbCmd.lte(endTime))
					}).limit(1000).get();

					console.log('查询到用户数量:', allUsers.length);

					// 按注册IP分组
					const ipGroups = this.groupUsersByIp(allUsers);
					
					// 筛选出相同IP注册的用户（排除单一IP注册的用户）
					const violationIpGroups = Object.entries(ipGroups).filter(([ip, users]) => users.length > 1);

					console.log('违规IP分组数量:', violationIpGroups.length);

					// 处理违规分组数据
					const processedGroups = await this.processViolationGroups(violationIpGroups);

					// 计算统计数据
					this.calculateStatistics(processedGroups);

					this.violationGroups = processedGroups;
					this.hasQueried = true;

					if (processedGroups.length === 0) {
						uni.showToast({
							title: '未发现违规注册',
							icon: 'success'
						});
					} else {
						uni.showToast({
							title: `发现${this.statisticsData.totalViolationUsers}个违规用户`,
							icon: 'none'
						});
					}

				} catch (error) {
					console.error('查询失败:', error);
					uni.showToast({
						title: '查询失败，请重试',
						icon: 'none'
					});
				} finally {
					this.loading = false;
				}
			},

			/**
			 * 按IP地址分组用户
			 * @param { Array } users - 用户列表
			 * @return { Object } 按IP分组的用户对象
			 */
			groupUsersByIp(users) {
				const ipGroups = {};
				
				users.forEach(user => {
					const ip = user.register_ip;
					if (!ipGroups[ip]) {
						ipGroups[ip] = [];
					}
					ipGroups[ip].push(user);
				});

				return ipGroups;
			},

			/**
			 * 处理违规分组数据
			 * @param { Array } violationIpGroups - 违规IP分组数据
			 * @return { Array } 处理后的分组数据
			 */
			async processViolationGroups(violationIpGroups) {
				const processedGroups = [];

				for (let [ip, users] of violationIpGroups) {
					// 获取邀请人信息
					const inviterInfo = await this.getInviterInfo(users);
					
					// 为每个用户添加邀请人邀请码信息
					const usersWithInviterCode = users.map(user => {
						const inviter = inviterInfo.find(inv => inv.inviterId === user.inviter_uid);
						return {
							...user,
							inviterInviteCode: inviter ? inviter.inviteCode : '无'
						};
					});

					processedGroups.push({
						ip: ip,
						users: usersWithInviterCode,
						inviterInfo: inviterInfo
					});
				}

				return processedGroups;
			},

			/**
			 * 获取邀请人信息
			 * @param { Array } users - 用户列表
			 * @return { Array } 邀请人信息列表
			 */
			async getInviterInfo(users) {
				// 收集所有邀请人ID，去除重复
				const inviterIds = [...new Set(users.map(user => user.inviter_uid).filter(id => id))];
				
				if (inviterIds.length === 0) {
					return [{ inviteCode: '无', count: users.length, riskLevel: '低', inviterId: null }];
				}

				// 批量查询邀请人信息
				const { result: { data: inviters } } = await userCollection.where({
					_id: dbCmd.in(inviterIds)
				}).field({
					_id: true,
					my_invite_code: true
				}).get();

				// 统计每个邀请人邀请的用户数量
				const inviterStats = {};
				users.forEach(user => {
					if (user.inviter_uid) {
						inviterStats[user.inviter_uid] = (inviterStats[user.inviter_uid] || 0) + 1;
					}
				});

				// 处理邀请人信息
				const inviterInfo = inviters.map(inviter => {
					const count = inviterStats[inviter._id] || 0;
					return {
						inviterId: inviter._id,
						inviteCode: inviter.my_invite_code,
						count: count,
						riskLevel: this.calculateRiskLevel(count)
					};
				});

				// 添加无邀请人的统计
				const noInviterCount = users.filter(user => !user.inviter_uid).length;
				if (noInviterCount > 0) {
					inviterInfo.push({
						inviterId: null,
						inviteCode: '无',
						count: noInviterCount,
						riskLevel: '低'
					});
				}

				return inviterInfo;
			},

			/**
			 * 计算风险等级
			 * @param { Number } count - 邀请用户数量
			 * @return { String } 风险等级
			 */
			calculateRiskLevel(count) {
				if (count >= 10) return '高';
				if (count >= 5) return '中';
				return '低';
			},

			/**
			 * 计算统计数据
			 * @param { Array } groups - 分组数据
			 */
			calculateStatistics(groups) {
				let totalUsers = 0;
				let suspiciousInviters = 0;

				groups.forEach(group => {
					totalUsers += group.users.length;
					
					// 统计可疑邀请人（中高风险等级的邀请人）
					group.inviterInfo.forEach(inviter => {
						if (inviter.riskLevel === '中' || inviter.riskLevel === '高') {
							suspiciousInviters++;
						}
					});
				});

				this.statisticsData = {
					totalViolationUsers: totalUsers,
					violationIpCount: groups.length,
					suspiciousInviters: suspiciousInviters
				};
			},

			/**
			 * 获取用户状态文本
			 * @param { Number } status - 用户状态
			 * @return { String } 状态文本
			 */
			getStatusText(status) {
				const statusMap = {
					0: '正常',
					1: '禁止购买会员',
					2: '审核中',
					3: '已被封禁'
				};
				return statusMap[status] || '未知';
			},

			/**
			 * 获取用户状态样式类
			 * @param { Number } status - 用户状态
			 * @return { String } 样式类名
			 */
			getStatusClass(status) {
				if (status === 0) return 'status-normal';
				if (status === 1) return 'status-restricted';
				if (status === 3) return 'status-banned';
				return 'status-default';
			},

			/**
			 * 获取风险等级样式类
			 * @param { String } riskLevel - 风险等级
			 * @return { String } 样式类名
			 */
			getRiskLevelClass(riskLevel) {
				if (riskLevel === '高') return 'risk-high';
				if (riskLevel === '中') return 'risk-medium';
				return 'risk-low';
			},

			/**
			 * 封禁用户
			 * @param { String } userId - 用户ID
			 * @param { Number } userIndex - 用户在列表中的索引
			 * @param { Number } groupIndex - 分组索引
			 */
			async banUser(userId, userIndex, groupIndex) {
				try {
					uni.showModal({
						title: '确认封禁',
						content: '确定要封禁该用户吗？',
						success: async (res) => {
							if (res.confirm) {
								uni.showLoading({
									title: '处理中...',
									mask: true
								});

								// 更新用户状态为已被封禁
								const { result: { updated } } = await userCollection.doc(userId).update({
									status: 3
								});

								if (updated > 0) {
									// 更新本地数据
									this.violationGroups[groupIndex].users[userIndex].status = 3;
									
									uni.hideLoading();
									uni.showToast({
										title: '封禁成功',
										icon: 'success'
									});
								} else {
									uni.hideLoading();
									uni.showToast({
										title: '封禁失败',
										icon: 'none'
									});
								}
							}
						}
					});
				} catch (error) {
					console.error('封禁用户失败:', error);
					uni.hideLoading();
					uni.showToast({
						title: '封禁失败，请重试',
						icon: 'none'
					});
				}
			},

			/**
			 * 封禁邀请人
			 * @param { String } inviteCode - 邀请码
			 * @param { String } inviterId - 邀请人ID
			 */
			async banInviter(inviteCode, inviterId) {
				if (!inviterId) {
					uni.showToast({
						title: '无效的邀请人',
						icon: 'none'
					});
					return;
				}

				try {
					uni.showModal({
						title: '确认封禁邀请人',
						content: `确定要封禁邀请码为 ${inviteCode} 的邀请人吗？`,
						success: async (res) => {
							if (res.confirm) {
								uni.showLoading({
									title: '处理中...',
									mask: true
								});

								// 更新邀请人状态为已被封禁
								const { result: { updated } } = await userCollection.doc(inviterId).update({
									status: 3
								});

								if (updated > 0) {
									uni.hideLoading();
									uni.showToast({
										title: '邀请人封禁成功',
										icon: 'success'
									});
									
									// 重新查询数据以更新页面
									await this.queryViolationUsers();
								} else {
									uni.hideLoading();
									uni.showToast({
										title: '封禁失败',
										icon: 'none'
									});
								}
							}
						}
					});
				} catch (error) {
					console.error('封禁邀请人失败:', error);
					uni.hideLoading();
					uni.showToast({
						title: '封禁失败，请重试',
						icon: 'none'
					});
				}
			},

			/**
			 * 编辑用户数据
			 * @param { String } userId - 用户ID
			 */
			editUser(userId) {
				uni.navigateTo({
					url: `/pages/member/users/edit?id=${userId}`
				});
			}
		}
	}
</script>

<style lang="scss">
	.container {
		padding: 10px;
	}

	.card {
		background-color: #333;
	}

	.uni-card-txt {
		color: #fff;
		font-size: 14px;
		line-height: 1.5;
	}

	.query-section {
		padding: 10px 0;
	}

	.section-title {
		font-size: 16px;
		font-weight: bold;
		color: #333;
		margin-bottom: 10px;
		display: block;
	}

	.uni-forms-item {
		margin-bottom: 15px;
		align-items: center;
	}

	.time-picker-display {
		width: 100%;
	}

	.time-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.time-button {
		padding: 5px 12px;
		border: 1px solid #e5e5e5;
		border-radius: 4px;
		background-color: white;
		font-size: 12px;
		color: #666;
	}

	.time-button.selected {
		border-color: #007aff;
		background-color: #007aff;
		color: white;
	}

	.query-actions {
		margin-top: 15px;
		text-align: center;
	}

	.statistics-section {
		padding: 10px 0;
	}

	.statistics-grid {
		display: flex;
		justify-content: space-around;
		margin-top: 10px;
	}

	.stat-item {
		text-align: center;
		flex: 1;
	}

	.stat-number {
		display: block;
		font-size: 24px;
		font-weight: bold;
		color: #007aff;
		margin-bottom: 5px;
	}

	.stat-label {
		font-size: 12px;
		color: #666;
	}

	.ip-group-header {
		padding: 15px;
		background-color: #f8f8f8;
		border-bottom: 1px solid #eee;
		margin-bottom: 10px;
	}

	.ip-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 10px;
	}

	.ip-address {
		font-size: 16px;
		font-weight: bold;
		color: #333;
	}

	.user-count {
		font-size: 14px;
		color: #666;
	}

	.inviter-info {
		border-top: 1px solid #eee;
		padding-top: 10px;
	}

	.inviter-label {
		font-size: 14px;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 8px;
	}

	.inviter-item {
		display: flex;
		align-items: center;
		gap: 15px;
		margin-bottom: 8px;
		padding: 8px;
		background-color: white;
		border-radius: 4px;
		border: 1px solid #eee;
	}

	.inviter-code, .inviter-count {
		font-size: 12px;
		color: #666;
	}

	.risk-level {
		font-size: 12px;
		padding: 2px 6px;
		border-radius: 3px;
		color: white;
	}

	.risk-high {
		background-color: #ff4d4f;
	}

	.risk-medium {
		
	}
	
</style>