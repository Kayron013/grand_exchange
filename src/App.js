import React, { Component } from "react";
import { AppBar, Toolbar, Typography, Fab, Icon, Grid, Modal } from '@material-ui/core';
import { Exchange } from './components/Exchange/Exchange';
import { ExchangeForm } from './components/ExchangeForm/ExchangeForm';
import './App.scss';


export class App extends Component {
    state = {
        exchanges: [
            { server: '10.52.79.211', exchange: 'some_exchange', level: '2' },
            { server: '10.52.79.211', exchange: 'some_exchange', level: '2' },
            { server: '10.52.79.211', exchange: 'some_exchange', level: '2' },
            { server: '10.52.79.211', exchange: 'some_exchange', level: '2' },
            { server: '10.52.79.211', exchange: 'some_exchange', level: '2' }
        ],
        modal_isOpen: false
    }


    renderExchanges = () => {
        return this.state.exchanges.map((exchange, i) => (
            <Grid item xs={6} md={4} key={i}>
                <Exchange {...exchange} closeHandler={this.removeExchange.bind(this)}/>
            </Grid>
        ))
    }

    addExchange = (server, exchange, level) => {
        const exchanges = [...this.state.exchanges];
        exchanges.push({ server, exchange, level });
    }

    removeExchange = (server, exchange) => {
        const exchanges = this.state.exchanges.filter(ex => ex.server !== server && ex.exchange !== exchange);
        this.setState(state => ({ exchanges }));
    }

    openModal = () => { this.setState(state => ({ modal_isOpen: true })) }

    closeModal = () => { this.setState(state => ({ modal_isOpen: false })) }

    handleSubmit = data => { alert('Form Submitted') }

    render() {
        const { modal_isOpen } = this.state;
        return (
            <div className='app'>
                <AppBar position="sticky" color="primary">
                    <Toolbar>
                        <Typography variant="h6" color="inherit">
                            Grand Exchange
                        </Typography>
                        <Fab color='secondary' className='add-btn' onClick={this.openModal}>
                            <Icon>add</Icon>
                        </Fab>
                    </Toolbar>
                </AppBar>
                <Modal open={modal_isOpen} onClose={this.closeModal}>
                    <ExchangeForm onSubmit={this.handleSubmit}></ExchangeForm>
                </Modal>
                <main>
                    <Grid container spacing={24} className='exchange-container'>
                        {this.renderExchanges()}
                    </Grid>
                </main>
            </div>
        )
    }
}