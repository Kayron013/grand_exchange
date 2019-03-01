import React, { Component } from 'react';
import { TextField, InputAdornment, Icon, Typography, Button } from '@material-ui/core';
import './ZmqForm.scss';

export default class ZmqForm extends Component {
    state = {
        server: '',
        touched: false
    }

    handleChange = evt => {
        this.setState({ server: evt.target.value });
    }

    handleBlur = evt => {
        this.setState({ touched: true });
    }

    handleEnter = e => {
        if (e.charCode == 13) {
            this.handleSubmit(e);  
        }
    }

    handleSubmit = _ => {
        if (!this.state.server) {
            this.setState({ touched: true });
            alert("Fill out required field");
        }
        else {
            this.props.onSubmit({ server: this.state.server, type: 'zmq' });
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
                        value={this.state.server}
                        onChange={this.handleChange}
                        variant='outlined'
                        error= {!this.state.server && this.state.touched}
                        onBlur={this.handleBlur}
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