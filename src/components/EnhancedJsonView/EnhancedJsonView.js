import React from 'react';
import JsonView from 'react-json-view';

export class EnhancedJsonView extends React.Component {
    shouldComponentUpdate = (next_props, next_state) => {
        const new_data = JSON.stringify(this.props.src) !== JSON.stringify(next_props.src);
        const new_level = this.props.collapsed !== next_props.collapsed;
        if (!new_data && !new_level) return false;
        return true;
    }

    render = () => <JsonView {...this.props} />
} 