import * as React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NavigationScreenProps } from 'react-navigation';
import { TodoItem } from '../api/todo-private/gen';
import { commonStyles } from '../commonStyles';
import ToastView from '../ToastView';
import { getTodoStatusName, getTodoStatusTextColor } from '../utils';

export default class FriendTodoDetailScreen extends React.Component<NavigationScreenProps<{todoItem: TodoItem}>> {
    public render() {
        const todoItem: TodoItem = this.props.navigation.state.params.todoItem;

        return (
            <View style={[commonStyles.screen, {paddingTop: 48, paddingHorizontal: 8}]}>
                <View style={[commonStyles.flexRowLeft]}>
                    <Text style={[commonStyles.text, styles.nameText]}>分类</Text>
                    <TextInput
                        style={[commonStyles.textInput, {width: 240}]}
                        value={todoItem.category}
                        editable={false}
                        placeholder={'未分类'}
                    />
                </View>
                <View style={[commonStyles.flexRowLeft]}>
                    <Text style={[commonStyles.text, styles.nameText]}>标题</Text>
                    <TextInput
                        style={[commonStyles.textInput, {width: 240}]}
                        value={todoItem.title}
                        editable={false}
                    />
                </View>
                <View style={[commonStyles.flexRowLeft]}>
                    <Text style={[commonStyles.text, styles.nameText]}>描述</Text>
                    <TextInput
                        style={[commonStyles.textInput, {width: 240}]}
                        value={todoItem.desc}
                        editable={false}
                    />
                </View>
                <View style={[commonStyles.flexRowLeft]}>
                    <Text style={[commonStyles.text, styles.nameText]}>状态</Text>
                    <TextInput
                        style={[commonStyles.textInput, {width: 240}, getTodoStatusTextColor(todoItem.status)]}
                        value={getTodoStatusName(todoItem.status)}
                        editable={false}
                    />
                </View>
                <ToastView/>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    nameText: {
        width: 60
    }
});