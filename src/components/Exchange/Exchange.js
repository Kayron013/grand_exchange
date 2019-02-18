import React, { Component } from 'react';
import { Button, Icon } from "@material-ui/core";
import { renderjson } from '../../lib/renderjson/renderjson';
import moment from "moment";
import { addListener, emitEvent } from "../../services/socket";
import './Exchange.scss';


export class Exchange extends Component {
    constructor(props) {
        super(props);
        this.state = {
            data: '',
            level: 1,
            isPaused: false
        };
        this.json_ref = React.createRef();
    }

    componentDidMount() {
        addListener(this.props.exchange, d => this.setState(state => ({ data: d })));
    }

    shouldComponentUpdate(next_props, next_state) {
        if (this.state.isPaused) return !next_state.isPaused
        return true;
    }

    componentDidUpdate() {
        const old_child = this.json_ref.current.firstElementChild;
        const new_child = renderjson.set_show_to_level(this.props.level)(this.state.data.content)
        this.json_ref.current.replaceChild(new_child, old_child);
    }

    updateLevel(new_level) { this.setState(state => ({ level: new_level })) }

    handlePlayClick() { this.setState(state => ({ isPaused: !state.isPaused })) }
    

    render() {
        const { exchange, server } = this.props;
        const { isPaused, data } = this.state;
        return (
            <div className='exchange'>
                <div className='heading'>
                    <div className='exchange-name'><a href={`#`} target='blank'>{exchange}</a></div>
                    <div className='server'><a href={`http://${server}`} target='blank'>({server})</a></div>
                </div>
                <div className='window'>
                    <div className='json' ref={this.json_ref}><div className='target-child'></div></div>
                    <div className='footer'>
                        <Button
                            variant='contained' 
                            color='primary' 
                            className='btn'
                            onClick={this.handlePlayClick.bind(this)}><Icon>{isPaused ? 'play_arrow' : 'pause'}</Icon></Button>
                        <div className='last-received'>Last Message Received: {moment(data.timestamp).format('hh:mm:ss a, MMM DD')}</div>
                    </div>
                </div>
                
            </div>
        )
    }
}