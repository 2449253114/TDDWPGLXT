<template>
	<view>
		
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
				
			}
		},
		methods: {
			
		}
	}
</script>

<style>

</style>
