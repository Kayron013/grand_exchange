import React, { Component } from "react";
import { AppBar, Toolbar, Typography, Fab, Icon, Grid, Modal } from '@material-ui/core';
import { Exchange } from './components/Exchange/Exchange';
import { ExchangeForm } from './components/ExchangeForm/ExchangeForm';
import { requestConnection, addListener, removeListener } from "./services/socket";
import './App.scss';


export class App extends Component {
    state = {
        exchanges: [
            { server: '10.52.79.211', exchange: 'some_exchange', routing_key: '', evt_key: '10.52.79.211:some_exchange:' }
        ],
        modal_isOpen: false
    }


    eventHandler = evt_key => d => {
        const exchanges = JSON.parse(JSON.stringify(this.state.exchanges));
        const exchange = exchanges.find(ex => ex.evt_key == evt_key);
        exchange.data = d;//JSON.stringify(d);
        this.setState(state => ({ exchanges }));
    }


    addExchange = (server, exchange, routing_key) => {
        const evt_key = `${server}:${exchange}:${routing_key}`;
        addListener(evt_key, this.eventHandler(evt_key));
        const exchanges = [...this.state.exchanges];
        exchanges.push({ server, exchange, routing_key, evt_key, data: {} });
        this.setState(state => ({ exchanges }));
    }


    removeExchange = evt_key => {
        removeListener(evt_key);
        const index = this.state.exchanges.findIndex(ex => ex.evt_key == evt_key);
        const exchanges = this.state.exchanges.slice();
        exchanges.splice(index, 1);
        this.setState(state => ({ exchanges }));
    }


    openModal = () => { this.setState(state => ({ modal_isOpen: true })) }


    closeModal = () => { this.setState(state => ({ modal_isOpen: false })) }


    handleSubmit = d => {
        console.log('request sent');
        requestConnection(d, res => {
            console.log('res', res);
            if (res.err) {
                alert('Error connecting to exchange');
                console.log('Error connecting to exchange', res.err);
            }
            else {
                this.addExchange(d.server, d.exchange, d.routing_key);
            }
        });
    }


    renderExchanges = () => {
        return this.state.exchanges.map((exchange, i) => (
            <Grid item xs={6} md={4} key={i}>
                <Exchange {...exchange} closeHandler={this.removeExchange}/>
            </Grid>
        ))
    }


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