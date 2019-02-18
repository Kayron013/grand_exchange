import React from "react";
import { Grid } from '@material-ui/core';
import { Exchange } from './components/Exchange/Exchange';

console.log('lolololololololol');

export const App = _ => {
    return (
        <div className='app'>
            <Grid container>
                <Grid xs={6}>
                    <Exchange server='10.52.79.211' exchange='some_exchange' level='all'/>
                </Grid>
            </Grid>
        </div>
    )
}