import React, { Component } from 'react';
import { TextField, InputAdornment, Icon, Typography, Button } from '@material-ui/core';
import './ZmqForm.scss';

export default class ZmqForm extends Component {
    state = {
        server: { val: '', touched: false },
        port: { val: '5556', touched: false }
    }

    handleChange = field => evt => {
        evt.persist();
        this.setState(state => ({ [field]: { ...state[field], val: evt.target.value } }));
    }

    handleBlur = field => evt => {
        this.setState(state => ({ [field]: { ...state[field], touched: true } }));
    }

    handleEnter = e => {
        if (e.charCode == 13) {
            this.handleSubmit(e);  
        }
    }

    shouldMarkError = field => this.state[field].val == '' && this.state[field].touched;

    canBeSubmited = _ => !Object.values(this.state).some(field => !field.val);

    handleSubmit = _ => {
        if (!this.canBeSubmited()) {
            this.setState(state => ({
                server: { ...state.server, touched: true },
                port: { ...state.port, touched: true }
            }));
            alert("Fill out all required fields");
        }
        else {
            this.props.onSubmit({ server: this.state.server.val, port: this.state.port.val, type: 'zmq' });
        }
    }

    render() {
        return (
            <form className='zmq-form' onKeyPress={this.handleEnter} onSubmit={evt => evt.preventDefault()}>
                <Typography variant='h6' className='form-heading'>Location</Typography>
                <div className='form-group'>
                    <TextField
                        id='server-name'
                        label='Server'
                        className='form-input'
                        value={this.state.server.val}
                        onChange={this.handleChange('server')}
                        variant='outlined'
                        error= {this.shouldMarkError('server')}
                        onBlur={this.handleBlur('server')}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>public</Icon></InputAdornment>,
                        }}
                    />
                    <TextField
                        id='server-port'
                        label='Port'
                        className='form-input'
                        value={this.state.port.val}
                        onChange={this.handleChange('port')}
                        variant='outlined'
                        error= {this.shouldMarkError('port')}
                        onBlur={this.handleBlur('port')}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>public</Icon></InputAdornment>,
                        }}
                    />
                </div>
                <div className='submit-area'>
                    <Button type="button" color='secondary' variant='contained' onClick={this.handleSubmit}>Connect</Button>
                </div>
            </form>
        )
    }
}