import React, { Component } from 'react';
import { Paper, TextField, InputAdornment, Icon, IconButton, Typography, Button } from '@material-ui/core';
import './ExchangeForm.scss';


export class ExchangeForm extends Component {
    state = {
        server: '',
        exchange: '',
        route_key: '',
        username: '',
        password: '',
        show_password: false
    }

    handleChange = field => evt => {
        evt.persist();
        this.setState(state => ({ [field]: evt.target.value }));
    }

    toggleShowPassword = evt => {
        this.setState(state => ({ show_password: !state.show_password }));
    }

    render() {
        const { server, exchange, route_key, username, password, show_password } = this.state;
        const handleSubmit = this.props.onSubmit;
        return (
            <Paper className='exchange-form' tabIndex={-1}>
                <Typography variant='h6' className='form-heading'>Exchange Route</Typography>
                <form>
                    <TextField
                        id='server-name'
                        label='Server'
                        className='form-input'
                        value={server}
                        onChange={this.handleChange('server')}
                        variant='outlined'
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>public</Icon></InputAdornment>,
                        }}
                    />
                    <TextField
                        id='exchange-name'
                        label='Exchange'
                        className='form-input'
                        value={exchange}
                        onChange={this.handleChange('exchange')}
                        variant='outlined'
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>inbox</Icon></InputAdornment>,
                        }}
                    />
                    <TextField
                        id='route-key'
                        label='Route Key (optional)'
                        className='form-input'
                        value={route_key}
                        onChange={this.handleChange('route_key')}
                        variant='outlined'
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>pageview</Icon></InputAdornment>
                        }}
                    />
                </form>
                <Typography variant='h6' className='form-heading'>Server Credentials</Typography>
                <form>
                    <TextField
                        id='username'
                        label='Username'
                        className='form-input'
                        value={username}
                        onChange={this.handleChange('username')}
                        variant='outlined'
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>person</Icon></InputAdornment>
                        }}
                    />
                    <TextField
                        id='password'
                        label='Password'
                        className='form-input'
                        type={show_password ? 'text' : 'password'}
                        value={password}
                        onChange={this.handleChange('password')}
                        variant='outlined'
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><Icon>vpn_key</Icon></InputAdornment>,
                            endAdornment:
                                <InputAdornment position="end">
                                  <IconButton
                                    aria-label="Toggle password visibility"
                                    onClick={this.toggleShowPassword}
                                  >
                                    {show_password ? <Icon>visibility</Icon> : <Icon>visibility_off</Icon>}
                                  </IconButton>
                                </InputAdornment>
                        }}
                    />
                </form>
                <div className='submit-area'>
                    <Button color='secondary' variant='contained' onClick={handleSubmit}>Connect</Button>
                </div>
            </Paper>
        )
    }
}